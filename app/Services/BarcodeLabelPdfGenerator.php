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
use Endroid\QrCode\Builder\Builder; // ← THIS IS THE NEW WAY
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\RoundBlockSizeMode;

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

            $barcodeImage = $this->barcodeGeneratorPNG->getBarcode(
                $value,
                $type,
                $this->setting->barcode_scale ?? 3,        // ← add fallback
                $this->setting->barcode_line_width ?? 80   // ← add fallback
            );

            return 'data:image/png;base64,' . base64_encode($barcodeImage);
        } catch (\Exception $e) {
            Log::error('Barcode generation error: ' . $e->getMessage());
            return null;
        }
    }

    protected function generateQrCode($value)
    {
        if (empty(trim($value))) {
            return null;
        }

        try {
            // CORRECT v6+ SYNTAX — NO ::create() ANYMORE!
            $result = Builder::create()
                ->writer(new PngWriter())
                ->data($value)
                ->encoding(new Encoding('UTF-8'))
                ->errorCorrectionLevel(ErrorCorrectionLevel::High)
                ->size(300)
                ->margin(10)
                ->roundBlockSizeMode(RoundBlockSizeMode::Margin)
                ->build();

            return 'data:image/png;base64,' . base64_encode($result->getString());
        } catch (\Throwable $e) {
            Log::error('QR code generation failed: ' . $e->getMessage());
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
        return match ((int)$level) {
            7  => ErrorCorrectionLevel::Low,
            15 => ErrorCorrectionLevel::Medium,
            25 => ErrorCorrectionLevel::Quartile,
            30 => ErrorCorrectionLevel::High,
            default => ErrorCorrectionLevel::High,
        };
    }

    protected function renderPdf($labels)
    {
        $html = $this->buildHtml($labels);

        return Pdf::loadHTML($html)
            ->setPaper('a4', $this->setting->paper_orientation) // Let DomPDF handle paper size
            ->setOption('isRemoteEnabled', true)
            ->setOption('defaultFont', 'Arial')
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('isPhpEnabled', false)
            ->stream('labels.pdf', ['Attachment' => false]);
    }

    protected function buildHtml($labels)
    {
        // Convert mm → pt (1mm = 2.83464567pt)
        $mm2pt = 2.83464567;

        $paperWidth = $this->setting->paper_width * $mm2pt;
        $paperHeight = $this->setting->paper_height * $mm2pt;
        $labelWidth = $this->setting->label_width * $mm2pt;
        $labelHeight = $this->setting->label_height * $mm2pt;
        $spacingH = $this->setting->label_spacing_horizontal * $mm2pt;
        $spacingV = $this->setting->label_spacing_vertical * $mm2pt;
        $marginTop = $this->setting->page_margin_top * $mm2pt;
        $marginRight = $this->setting->page_margin_right * $mm2pt;
        $marginBottom = $this->setting->page_margin_bottom * $mm2pt;
        $marginLeft = $this->setting->page_margin_left * $mm2pt;
        $barcodeWidth = $this->setting->barcode_width * $mm2pt;
        $barcodeHeight = $this->setting->barcode_height * $mm2pt;

        $labelsPerPage = $this->setting->labels_per_row * $this->setting->labels_per_column;

        $html = '<!DOCTYPE html>
    <html><head>
        <meta charset="utf-8">
        <style>
            @page { margin: 0; }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .page {
                width: ' . $paperWidth . 'pt;
                height: ' . $paperHeight . 'pt;
                padding: ' . $marginTop . 'pt ' . $marginRight . 'pt ' . $marginBottom . 'pt ' . $marginLeft . 'pt;
                display: grid;
                grid-template-columns: repeat(' . $this->setting->labels_per_row . ', 1fr);
                gap: ' . $spacingV . 'pt ' . $spacingH . 'pt;
                page-break-after: always;
            }
            .label {
                width: ' . $labelWidth . 'pt;
                height: ' . $labelHeight . 'pt;
                border: 1pt solid #ddd;
                padding: 8pt;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                font-size: ' . $this->setting->font_size . 'pt;
                color: ' . $this->setting->font_color . ';
            }
            .barcode-img { max-width: ' . $barcodeWidth . 'pt; max-height: ' . $barcodeHeight . 'pt; display: block; margin: 0 auto; }
            .qr-code { width: 60pt; height: 60pt; display: block; margin: 0 auto; }
            .text-center { text-align: center; }
            .font-mono { font-family: monospace; }
            .bold { font-weight: bold; }
        </style>
    </head><body>';

        $labelCount = 0;
        foreach ($labels as $label) {
            if ($labelCount % $labelsPerPage === 0) {
                if ($labelCount > 0) $html .= '</div>';
                $html .= '<div class="page">';
            }

            $html .= '<div class="label">';

            // Top: Product info
            if ($this->setting->show_product_title || $this->setting->show_sku || $this->setting->show_variant) {
                $html .= '<div>';
                if ($this->setting->show_product_title) {
                    $html .= '<div class="bold">' . htmlspecialchars($label['product_title'] ?? '') . '</div>';
                }
                if ($this->setting->show_variant && !empty($label['variant_title'])) {
                    $html .= '<div>' . htmlspecialchars($label['variant_title']) . '</div>';
                }
                if ($this->setting->show_sku && !empty($label['sku'])) {
                    $html .= '<div class="font-mono">SKU: ' . htmlspecialchars($label['sku']) . '</div>';
                }
                $html .= '</div>';
            }

            // Price
            if ($this->setting->show_price && !empty($label['price'])) {
                $html .= '<div class="text-center bold">$' . number_format($label['price'], 2) . '</div>';
            }

            // Barcode / QR
            if ($this->setting->show_linear_barcode && !empty($label['barcode_html'])) {
                $html .= '<div class="text-center">';
                $html .= '<img src="' . $label['barcode_html'] . '" class="barcode-img">';
                if ($this->setting->print_barcode_value ?? true) {
                    $html .= '<div class="font-mono">' . htmlspecialchars($label['barcode_value']) . '</div>';
                }
                $html .= '</div>';
            } elseif ($this->setting->show_qr_code && !empty($label['qr_code'])) {
                $html .= '<div class="text-center"><img src="' . $label['qr_code'] . '" class="qr-code"></div>';
            }

            $html .= '</div>'; // .label
            $labelCount++;
        }

        if ($labelCount > 0) $html .= '</div>'; // last page
        $html .= '</body></html>';

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
