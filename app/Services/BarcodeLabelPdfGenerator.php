<?php

namespace App\Services;

use App\Models\BarcodePrinterSetting;
use App\Models\Variant;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Illuminate\Support\Facades\Log;

class BarcodeLabelPdfGenerator
{
    protected $setting;
    protected $barcodeGenerator;

    // Conversion constants
    const MM_TO_PT = 2.83464567;
    const PT_TO_PX = 1.33333333;

    public function __construct(BarcodePrinterSetting $setting)
    {
        $this->setting = $setting;
        $this->barcodeGenerator = new BarcodeGeneratorPNG();
    }

    public function generatePdf($variantIds, $quantityPerVariant = 1)
    {
        try {
            $variants = Variant::whereIn('id', $variantIds)
                ->with('product')
                ->get();

            if ($variants->isEmpty()) {
                throw new \Exception('No variants found');
            }

            $labels = [];
            foreach ($variants as $variant) {
                for ($i = 0; $i < $quantityPerVariant; $i++) {
                    $labels[] = $this->generateLabelData($variant);
                }
            }

            return $this->renderPdf($labels);
        } catch (\Exception $e) {
            Log::error('PDF Generation Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function generateLabelData($variant)
    {
        $barcodeValue = $this->getBarcodeValue($variant);

        $data = [
            'variant' => $variant,
            'barcode_value' => $barcodeValue,
            'product_title' => $variant->product->title ?? 'Untitled Product',
            'variant_title' => $this->getVariantTitle($variant),
            'sku' => $variant->sku ?? '',
            'price' => $variant->price ?? 0,
            'vendor' => $variant->product->vendor ?? '',
            'product_type' => $variant->product->product_type ?? '',
        ];

        // Determine which barcode/QR to generate based on settings
        $showQr = $this->setting->show_qr_code ?? false;
        $showLinear = $this->setting->show_linear_barcode ?? true;

        if ($showQr) {
            $data['qr_code'] = $this->generateQrCode($barcodeValue);
        } else {
            $data['qr_code'] = null;
        }

        if ($showLinear && !$this->isQrCodeType()) {
            $data['barcode_html'] = $this->generateBarcode($barcodeValue);
        } else {
            $data['barcode_html'] = null;
        }

        return $data;
    }

    protected function getBarcodeValue($variant)
    {
        if (!empty($variant->barcode)) {
            return $variant->barcode;
        }
        if (!empty($variant->sku)) {
            return $variant->sku;
        }
        return "VAR-{$variant->id}";
    }

    protected function getVariantTitle($variant)
    {
        $parts = array_filter([
            $variant->option1,
            $variant->option2,
            $variant->option3
        ]);
        return !empty($parts) ? implode(' / ', $parts) : 'Default Title';
    }

    protected function isQrCodeType()
    {
        return in_array($this->setting->barcode_type, ['qr', 'datamatrix']);
    }

    protected function generateBarcode($value)
    {
        try {
            if (empty(trim($value))) {
                return $this->generateFallbackBarcode('NO BARCODE');
            }

            $type = $this->mapBarcodeType($this->setting->barcode_type);

            // Validate barcode value based on type
            $value = $this->validateBarcodeValue($value, $this->setting->barcode_type);

            $scale = max(1, $this->setting->barcode_scale ?? 2);
            $thickness = max(30, $this->setting->barcode_line_width ?? 60);

            $barcodeImage = $this->barcodeGenerator->getBarcode(
                $value,
                $type,
                $scale,
                $thickness
            );

            return 'data:image/png;base64,' . base64_encode($barcodeImage);
        } catch (\Exception $e) {
            Log::error('Barcode generation error', [
                'value' => $value,
                'type' => $this->setting->barcode_type,
                'error' => $e->getMessage()
            ]);
            return $this->generateFallbackBarcode($value);
        }
    }

    protected function validateBarcodeValue($value, $type)
    {
        switch ($type) {
            case 'ean13':
                return $this->padOrTruncate($value, 13, '0');
            case 'ean8':
                return $this->padOrTruncate($value, 8, '0');
            case 'upca':
                return $this->padOrTruncate($value, 12, '0');
            case 'itf14':
                return $this->padOrTruncate($value, 14, '0');
            default:
                return $value;
        }
    }

    protected function padOrTruncate($value, $length, $pad = '0')
    {
        $numeric = preg_replace('/[^0-9]/', '', $value);
        if (strlen($numeric) > $length) {
            return substr($numeric, 0, $length);
        }
        return str_pad($numeric, $length, $pad, STR_PAD_LEFT);
    }

    protected function generateQrCode($value)
    {
        if (empty(trim($value))) {
            return null;
        }

        try {
            $size = max(100, min(500, $this->setting->barcode_width * self::MM_TO_PT * 2));
            $errorLevel = $this->mapQrErrorCorrection($this->setting->qr_error_correction ?? 15);

            $result = Builder::create()
                ->writer(new PngWriter())
                ->data($value)
                ->encoding(new Encoding('UTF-8'))
                ->errorCorrectionLevel($errorLevel)
                ->size((int)$size)
                ->margin(10)
                ->roundBlockSizeMode(RoundBlockSizeMode::Margin)
                ->build();

            return 'data:image/png;base64,' . base64_encode($result->getString());
        } catch (\Throwable $e) {
            Log::error('QR code generation failed', [
                'value' => $value,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    protected function generateFallbackBarcode($text = 'BARCODE ERROR')
    {
        $width = 300;
        $height = 100;
        $image = imagecreate($width, $height);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);

        // Center the text
        $fontSize = 3;
        $textWidth = imagefontwidth($fontSize) * strlen($text);
        $x = ($width - $textWidth) / 2;
        $y = ($height - imagefontheight($fontSize)) / 2;

        imagestring($image, $fontSize, $x, $y, $text, $black);

        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        return 'data:image/png;base64,' . base64_encode($imageData);
    }

    protected function mapBarcodeType($type)
    {
        $typeMap = [
            'code128' => BarcodeGeneratorPNG::TYPE_CODE_128,
            'ean13' => BarcodeGeneratorPNG::TYPE_EAN_13,
            'ean8' => BarcodeGeneratorPNG::TYPE_EAN_8,
            'upca' => BarcodeGeneratorPNG::TYPE_UPC_A,
            'code39' => BarcodeGeneratorPNG::TYPE_CODE_39,
            'code93' => BarcodeGeneratorPNG::TYPE_CODE_93,
            'codabar' => BarcodeGeneratorPNG::TYPE_CODABAR,
            'itf14' => BarcodeGeneratorPNG::TYPE_INTERLEAVED_2_5,
        ];

        return $typeMap[$type] ?? BarcodeGeneratorPNG::TYPE_CODE_128;
    }

    protected function mapQrErrorCorrection($level)
    {
        return match ((int)$level) {
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

        $paperSize = [
            0,
            0,
            $this->setting->paper_width * self::MM_TO_PT,
            $this->setting->paper_height * self::MM_TO_PT
        ];

        return Pdf::loadHTML($html)
            ->setPaper($paperSize, $this->setting->paper_orientation)
            ->setOption('isRemoteEnabled', true)
            ->setOption('isHtml5ParserEnabled', true)
            ->setOption('isPhpEnabled', false)
            ->setOption('isFontSubsettingEnabled', true)
            ->setOption('defaultFont', $this->setting->font_family ?? 'Arial')
            ->setOption('dpi', 300)
            ->setOption('defaultMediaType', 'print')
            ->setOption('debugLayout', false)
            ->setOption('debugLayoutLines', false)
            ->setOption('debugLayoutBlocks', false)
            ->setOption('debugLayoutInline', false)
            ->stream('barcode-labels.pdf', ['Attachment' => false]);
    }

    protected function buildHtml($labels)
    {
        $s = $this->setting;

        // Convert all measurements to points
        $labelWidth = $s->label_width * self::MM_TO_PT;
        $labelHeight = $s->label_height * self::MM_TO_PT;
        $hSpacing = $s->label_spacing_horizontal * self::MM_TO_PT;
        $vSpacing = $s->label_spacing_vertical * self::MM_TO_PT;
        $marginTop = ($s->page_margin_top ?? 10) * self::MM_TO_PT;
        $marginRight = ($s->page_margin_right ?? 10) * self::MM_TO_PT;
        $marginBottom = ($s->page_margin_bottom ?? 10) * self::MM_TO_PT;
        $marginLeft = ($s->page_margin_left ?? 10) * self::MM_TO_PT;

        $barcodeWidth = ($s->barcode_width ?? 60) * self::MM_TO_PT;
        $barcodeHeight = ($s->barcode_height ?? 20) * self::MM_TO_PT;

        $cols = max(1, (int)$s->labels_per_row);
        $rows = max(1, (int)$s->labels_per_column);
        $labelsPerPage = $cols * $rows;

        $fontSize = max(6, (int)($s->font_size ?? 10));
        $titleSize = max(8, (int)($s->title_font_size ?? 12));
        $fontColor = $s->font_color ?? '#000000';
        $fontFamily = $s->font_family ?? 'Arial';

        $html = "<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        @page {
            margin: 0;
            size: {$s->paper_width}mm {$s->paper_height}mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            margin: {$marginTop}pt {$marginRight}pt {$marginBottom}pt {$marginLeft}pt;
            font-family: {$fontFamily}, Arial, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page {
            width: 100%;
            page-break-after: always;
        }
        .page:last-child {
            page-break-after: avoid;
        }
        .label-grid {
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: {$hSpacing}pt {$vSpacing}pt;
        }
        .label-row {
            display: table-row;
        }
        .label {
            display: table-cell;
            width: {$labelWidth}pt;
            height: {$labelHeight}pt;
            padding: 4pt;
            vertical-align: top;
            border: 0.5pt solid #ddd;
            font-size: {$fontSize}pt;
            color: {$fontColor};
            overflow: hidden;
        }
        .label-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 2pt;
        }
        .label-header {
            flex-shrink: 0;
        }
        .label-barcode {
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            min-height: 0;
        }
        .label-footer {
            flex-shrink: 0;
        }
        .product-title {
            font-weight: " . ($s->title_bold ? 'bold' : 'normal') . ";
            font-size: {$titleSize}pt;
            line-height: 1.1;
            margin-bottom: 2pt;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-wrap: break-word;
        }
        .variant-title {
            font-size: " . max(6, $fontSize - 1) . "pt;
            color: #666;
            margin-bottom: 1pt;
            line-height: 1.1;
        }
        .sku {
            font-size: " . max(6, $fontSize - 1) . "pt;
            color: #444;
            margin-bottom: 1pt;
            font-family: 'Courier New', monospace;
        }
        .vendor, .product-type {
            font-size: " . max(6, $fontSize - 2) . "pt;
            color: #888;
            margin-bottom: 1pt;
        }
        .price {
            font-weight: bold;
            font-size: " . ($titleSize) . "pt;
            margin: 2pt 0;
            color: #000;
        }
        .barcode-container {
            text-align: center;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .barcode-img {
            max-width: 100%;
            width: {$barcodeWidth}pt;
            height: auto;
            max-height: {$barcodeHeight}pt;
            display: block;
            margin: 0 auto;
            object-fit: contain;
        }
        .qr-code {
            width: " . min($barcodeWidth, $barcodeHeight) . "pt;
            height: " . min($barcodeWidth, $barcodeHeight) . "pt;
            display: block;
            margin: 0 auto;
            object-fit: contain;
        }
        .barcode-value {
            font-family: 'Courier New', monospace;
            font-size: " . max(6, $fontSize - 2) . "pt;
            text-align: center;
            margin-top: 1pt;
            letter-spacing: 0.3pt;
            color: #000;
        }
    </style>
</head>
<body>";

        $chunks = array_chunk($labels, $labelsPerPage);

        foreach ($chunks as $pageIndex => $pageLabels) {
            $html .= "<div class='page'><div class='label-grid'>";

            // Organize labels into rows
            $labelRows = array_chunk($pageLabels, $cols);

            foreach ($labelRows as $rowLabels) {
                $html .= "<div class='label-row'>";

                foreach ($rowLabels as $label) {
                    $html .= $this->buildLabelHtml($label);
                }

                // Fill empty cells in last row
                $emptyCells = $cols - count($rowLabels);
                for ($i = 0; $i < $emptyCells; $i++) {
                    $html .= "<div class='label'></div>";
                }

                $html .= "</div>"; // .label-row
            }

            $html .= "</div></div>"; // .label-grid .page
        }

        $html .= "</body></html>";

        return $html;
    }

    protected function buildLabelHtml($label)
    {
        $s = $this->setting;

        $html = "<div class='label'><div class='label-content'>";

        // HEADER SECTION - Product Info
        $html .= "<div class='label-header'>";

        if ($s->show_product_title) {
            $html .= "<div class='product-title'>" .
                htmlspecialchars($label['product_title']) .
                "</div>";
        }

        if ($s->show_variant && $label['variant_title'] !== 'Default Title') {
            $html .= "<div class='variant-title'>" .
                htmlspecialchars($label['variant_title']) .
                "</div>";
        }

        if ($s->show_sku && !empty($label['sku'])) {
            $html .= "<div class='sku'>SKU: " .
                htmlspecialchars($label['sku']) .
                "</div>";
        }

        if ($s->show_price && !empty($label['price'])) {
            $html .= "<div class='price'>$" .
                number_format((float)$label['price'], 2) .
                "</div>";
        }

        $html .= "</div>"; // .label-header

        // BARCODE SECTION
        $html .= "<div class='label-barcode'>";
        $html .= $this->buildBarcodeSection($label);
        $html .= "</div>"; // .label-barcode

        // FOOTER SECTION
        $html .= "<div class='label-footer'>";

        if ($s->show_vendor && !empty($label['vendor'])) {
            $html .= "<div class='vendor'>Vendor: " .
                htmlspecialchars($label['vendor']) .
                "</div>";
        }

        if ($s->show_product_type && !empty($label['product_type'])) {
            $html .= "<div class='product-type'>Type: " .
                htmlspecialchars($label['product_type']) .
                "</div>";
        }

        $html .= "</div>"; // .label-footer

        $html .= "</div></div>"; // .label-content .label

        return $html;
    }

    protected function buildBarcodeSection($label)
    {
        $s = $this->setting;
        $html = "<div class='barcode-container'>";

        $showLinear = $s->show_linear_barcode ?? true;
        $showQr = $s->show_qr_code ?? false;
        $showValue = $s->show_barcode_value ?? true;

        if ($showLinear && !empty($label['barcode_html'])) {
            $html .= "<img src='{$label['barcode_html']}' class='barcode-img' alt='Barcode' />";

            if ($showValue) {
                $html .= "<div class='barcode-value'>" .
                    htmlspecialchars($label['barcode_value']) .
                    "</div>";
            }
        }

        if ($showQr && !empty($label['qr_code'])) {
            $html .= "<img src='{$label['qr_code']}' class='qr-code' alt='QR Code' />";

            if ($showValue && !$showLinear) {
                $html .= "<div class='barcode-value'>" .
                    htmlspecialchars($label['barcode_value']) .
                    "</div>";
            }
        }

        // If no barcode is available, show the value as text
        if (empty($label['barcode_html']) && empty($label['qr_code'])) {
            $html .= "<div class='barcode-value' style='font-size: 14pt; padding: 10pt;'>" .
                htmlspecialchars($label['barcode_value']) .
                "</div>";
        }

        $html .= "</div>";

        return $html;
    }
}
