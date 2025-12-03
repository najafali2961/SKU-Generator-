<?php

namespace App\Services;

use App\Models\BarcodePrinterSetting;
use App\Models\Variant;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Illuminate\Support\Facades\Log;

class BarcodeLabelPdfGenerator
{
    protected $setting;
    protected $barcodeGeneratorPNG;

    public function __construct(BarcodePrinterSetting $setting)
    {
        $this->setting = $setting;
        $this->barcodeGeneratorPNG = new BarcodeGeneratorPNG();
    }

    public function generatePdf($variantIds, $quantityPerVariant = 1)
    {
        $variants = Variant::whereIn('id', $variantIds)->with('product')->get();

        $labels = [];
        foreach ($variants as $variant) {
            for ($i = 0; $i < $quantityPerVariant; $i++) {
                $labels[] = $this->generateLabelData($variant);
            }
        }

        return $this->renderPdf($labels);
    }

    protected function generateLabelData($variant)
    {
        $barcodeValue = $variant->barcode ?? $variant->sku ?? "SKU-{$variant->id}";

        return [
            'variant' => $variant,
            'barcode_value' => $barcodeValue,
            'barcode_html' => $this->generateBarcode($barcodeValue),
            'qr_code' => $this->generateQrCode($barcodeValue),
            'product_title' => $variant->product->title,
            'variant_title' => $variant->title,
            'sku' => $variant->sku,
            'price' => $variant->price,
        ];
    }

    protected function generateBarcode($value)
    {
        try {
            $type = $this->mapBarcodeType($this->setting->barcode_type);

            // Generate barcode as PNG and convert to base64
            $barcodeImage = $this->barcodeGeneratorPNG->getBarcode(
                $value,
                $type,
                $this->setting->barcode_scale,
                $this->setting->barcode_line_width
            );

            return 'data:image/png;base64,' . base64_encode($barcodeImage);
        } catch (\Exception $e) {
            Log::error('Barcode generation error: ' . $e->getMessage());
            return null;
        }
    }

    protected function generateQrCode($value)
    {
        try {
            $errorCorrection = $this->mapQrErrorCorrection($this->setting->qr_error_correction);

            $qrCode = QrCode::create($value)
                ->setSize(300)
                ->setMargin($this->setting->qr_module_size)
                ->setErrorCorrectionLevel($errorCorrection);

            $writer = new PngWriter();
            $result = $writer->write($qrCode);

            return 'data:image/png;base64,' . base64_encode($result->getString());
        } catch (\Exception $e) {
            Log::error('QR code generation error: ' . $e->getMessage());
            return null;
        }
    }

    protected function mapBarcodeType($type)
    {
        $typeMap = [
            'code128' => BarcodeGeneratorPNG::TYPE_CODE_128,
            'ean13' => BarcodeGeneratorPNG::TYPE_EAN_13,
            'ean8' => BarcodeGeneratorPNG::TYPE_EAN_8,
            'upca' => BarcodeGeneratorPNG::TYPE_UPC_A,
            'code39' => BarcodeGeneratorPNG::TYPE_CODE_39,
            'codabar' => BarcodeGeneratorPNG::TYPE_CODABAR,
        ];

        return $typeMap[$type] ?? BarcodeGeneratorPNG::TYPE_CODE_128;
    }

    protected function mapQrErrorCorrection($level): ErrorCorrectionLevel
    {
        // ErrorCorrectionLevel: 7%, 15%, 25%, 30%
        return match ($level) {
            7 => ErrorCorrectionLevel::Low,
            15 => ErrorCorrectionLevel::Medium,
            25 => ErrorCorrectionLevel::Quartile,
            30 => ErrorCorrectionLevel::High,
            default => ErrorCorrectionLevel::Medium,
        };
    }

    protected function renderPdf($labels)
    {
        $html = $this->buildHtml($labels);

        return Pdf::loadHTML($html)
            ->setPaper(
                [$this->setting->paper_width, $this->setting->paper_height],
                $this->setting->paper_orientation
            )
            ->setOption('margin-top', $this->setting->page_margin_top)
            ->setOption('margin-bottom', $this->setting->page_margin_bottom)
            ->setOption('margin-left', $this->setting->page_margin_left)
            ->setOption('margin-right', $this->setting->page_margin_right)
            ->stream('barcode-labels.pdf');
    }

    protected function buildHtml($labels)
    {
        $labelWidth = $this->setting->label_width;
        $labelHeight = $this->setting->label_height;
        $barcodeHeight = $this->setting->barcode_height;
        $barcodeWidth = $this->setting->barcode_width;
        $spacing = $this->setting->label_spacing_horizontal;
        $verticalSpacing = $this->setting->label_spacing_vertical;

        $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: {$this->setting->font_family};
            color: {$this->setting->font_color};
        }

        .page {
            width: {$this->setting->paper_width}mm;
            height: {$this->setting->paper_height}mm;
            display: grid;
            grid-template-columns: repeat({$this->setting->labels_per_row}, 1fr);
            gap: {$spacing}mm {$verticalSpacing}mm;
            padding: {$this->setting->page_margin_top}mm
                     {$this->setting->page_margin_right}mm
                     {$this->setting->page_margin_bottom}mm
                     {$this->setting->page_margin_left}mm;
        }

        .label {
            width: {$labelWidth}mm;
            height: {$labelHeight}mm;
            border: 1px solid #ddd;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: {$this->setting->font_size}px;
        }

        .label-top {
            display: flex;
            flex-direction: column;
            gap: 2mm;
        }

        .label-middle {
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .label-bottom {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .product-title {
            font-weight: bold;
            font-size: {$this->setting->font_size}px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sku {
            color: #666;
        }

        .variant-title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .price {
            font-weight: bold;
        }

        .barcode-img {
            max-width: {$barcodeWidth}mm;
            max-height: {$barcodeHeight}mm;
            display: block;
            margin: 0 auto;
        }

        .qr-code {
            max-width: 20mm;
            max-height: 20mm;
            display: block;
            margin: 0 auto;
        }

        .barcode-value {
            font-family: monospace;
            text-align: center;
            margin-top: 1mm;
        }

        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
HTML;

        $labelCount = 0;
        $labelsPerPage = $this->setting->labels_per_row * $this->setting->labels_per_column;

        foreach ($labels as $label) {
            if ($labelCount > 0 && $labelCount % $labelsPerPage === 0) {
                $html .= '</div><div class="page">';
            } elseif ($labelCount === 0) {
                $html .= '<div class="page">';
            }

            $html .= $this->buildLabelHtml($label);
            $labelCount++;
        }

        $html .= '</div></body></html>';

        return $html;
    }

    protected function buildLabelHtml($label)
    {
        $html = '<div class="label">';

        // Top section - Product info
        if ($this->setting->show_product_title || $this->setting->show_sku || $this->setting->show_variant) {
            $html .= '<div class="label-top">';

            if ($this->setting->show_product_title) {
                $html .= '<div class="product-title">' . htmlspecialchars($label['product_title']) . '</div>';
            }

            if ($this->setting->show_sku && $label['sku']) {
                $html .= '<div class="sku">SKU: ' . htmlspecialchars($label['sku']) . '</div>';
            }

            if ($this->setting->show_variant && $label['variant_title']) {
                $html .= '<div class="variant-title">' . htmlspecialchars($label['variant_title']) . '</div>';
            }

            $html .= '</div>';
        }

        // Middle section - Barcode/QR
        if (
            $this->setting->barcode_position === 'top' &&
            ($this->setting->show_linear_barcode || $this->setting->show_qr_code)
        ) {
            $html .= $this->buildBarcodeSection($label);
        }

        // Price
        if ($this->setting->show_price && $label['price']) {
            $html .= '<div class="price">$' . number_format($label['price'], 2) . '</div>';
        }

        // Middle section - Barcode/QR (center)
        if (
            $this->setting->barcode_position === 'center' &&
            ($this->setting->show_linear_barcode || $this->setting->show_qr_code)
        ) {
            $html .= '<div class="label-middle">' . $this->buildBarcodeSection($label) . '</div>';
        }

        // Bottom section - Barcode/QR
        if (
            $this->setting->barcode_position === 'bottom' &&
            ($this->setting->show_linear_barcode || $this->setting->show_qr_code)
        ) {
            $html .= $this->buildBarcodeSection($label);
        }

        $html .= '</div>';

        return $html;
    }

    protected function buildBarcodeSection($label)
    {
        $html = '';

        if ($this->setting->show_linear_barcode && $label['barcode_html']) {
            $html .= '<div class="label-middle"><img src="' . $label['barcode_html'] . '" class="barcode-img" /></div>';

            if ($this->setting->print_barcode_value) {
                $html .= '<div class="barcode-value">' . htmlspecialchars($label['barcode_value']) . '</div>';
            }
        } elseif ($this->setting->show_qr_code && $label['qr_code']) {
            $html .= '<div class="label-middle"><img src="' . $label['qr_code'] . '" class="qr-code" /></div>';
        }

        return $html;
    }
}
