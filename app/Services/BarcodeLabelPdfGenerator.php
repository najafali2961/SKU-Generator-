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

        // Generate barcode or QR code
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
            $value = $this->validateBarcodeValue($value, $this->setting->barcode_type);

            $scale = max(1, (int)($this->setting->barcode_scale ?? 2));
            $thickness = max(30, (int)($this->setting->barcode_line_width ?? 50));

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
            ->stream('barcode-labels.pdf', ['Attachment' => false]);
    }

    protected function buildHtml($labels)
    {
        $s = $this->setting;

        // Convert measurements to points (CSS points, not pixels)
        $labelWidth = $s->label_width * self::MM_TO_PT;
        $labelHeight = $s->label_height * self::MM_TO_PT;
        $hGap = $s->label_spacing_horizontal * self::MM_TO_PT;
        $vGap = $s->label_spacing_vertical * self::MM_TO_PT;

        $marginTop = ($s->page_margin_top ?? 10) * self::MM_TO_PT;
        $marginRight = ($s->page_margin_right ?? 10) * self::MM_TO_PT;
        $marginBottom = ($s->page_margin_bottom ?? 10) * self::MM_TO_PT;
        $marginLeft = ($s->page_margin_left ?? 10) * self::MM_TO_PT;

        $barcodeWidth = ($s->barcode_width ?? 30) * self::MM_TO_PT;
        $barcodeHeight = ($s->barcode_height ?? 15) * self::MM_TO_PT;

        $cols = max(1, (int)$s->labels_per_row);
        $rows = max(1, (int)$s->labels_per_column);
        $labelsPerPage = $cols * $rows;

        $fontSize = max(6, (int)($s->font_size ?? 8));
        $titleSize = max(7, (int)($s->title_font_size ?? 9));
        $fontColor = $s->font_color ?? '#000000';
        $fontFamily = $s->font_family ?? 'Arial';
        $titleBold = $s->title_bold ? 'bold' : 'normal';

        // Calculate inner padding (reduced for small labels)
        $labelPadding = max(2, min(4, $labelHeight * 0.03));

        $html = <<<HTML
<!DOCTYPE html>
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
            font-size: {$fontSize}pt;
            color: {$fontColor};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.1;
        }

        .page {
            page-break-after: always;
            width: 100%;
        }

        .page:last-child {
            page-break-after: avoid;
        }

        .label-grid {
            display: flex;
            flex-wrap: wrap;
            gap: {$vGap}pt {$hGap}pt;
        }

        .label {
            width: {$labelWidth}pt;
            height: {$labelHeight}pt;
            border: 0.5pt solid #cccccc;
            padding: {$labelPadding}pt;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
            background: white;
        }

        .label-header {
            flex-shrink: 0;
            margin-bottom: 1pt;
        }

        .label-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 0;
            overflow: hidden;
        }

        .label-footer {
            flex-shrink: 0;
            margin-top: 1pt;
        }

        .product-title {
            font-weight: {$titleBold};
            font-size: {$titleSize}pt;
            line-height: 1.1;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            word-break: break-word;
            margin-bottom: 1pt;
        }

        .variant-title {
            font-size: {$fontSize}pt;
            color: #666;
            line-height: 1.1;
            margin-bottom: 0.5pt;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sku {
            font-size: {$fontSize}pt;
            font-family: 'Courier New', monospace;
            color: #333;
            line-height: 1.1;
            margin-bottom: 0.5pt;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .price {
            font-weight: bold;
            font-size: {$titleSize}pt;
            color: #000;
            line-height: 1.1;
            margin: 1pt 0;
        }

        .vendor,
        .product-type {
            font-size: " . ($fontSize - 1) . "pt;
            color: #888;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .barcode-container {
            width: 100%;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .barcode-img {
            max-width: 100%;
            max-height: {$barcodeHeight}pt;
            width: auto;
            height: auto;
            display: block;
            margin: 0 auto;
        }

        .qr-code {
            width: " . min($barcodeWidth, $barcodeHeight, $labelWidth * 0.6) . "pt;
            height: " . min($barcodeWidth, $barcodeHeight, $labelWidth * 0.6) . "pt;
            display: block;
            margin: 0 auto;
        }

        .barcode-value {
            font-family: 'Courier New', monospace;
            font-size: " . ($fontSize - 1) . "pt;
            line-height: 1.1;
            margin-top: 1pt;
            text-align: center;
            letter-spacing: 0.2pt;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
        }
    </style>
</head>
<body>
HTML;

        // Split labels into pages
        $pages = array_chunk($labels, $labelsPerPage);

        foreach ($pages as $pageLabels) {
            $html .= "<div class='page'><div class='label-grid'>";

            foreach ($pageLabels as $label) {
                $html .= $this->buildLabelHtml($label);
            }

            $html .= "</div></div>";
        }

        $html .= "</body></html>";

        return $html;
    }

    protected function buildLabelHtml($label)
    {
        $s = $this->setting;

        $html = "<div class='label'>";

        // HEADER
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

        $html .= "</div>"; // header

        // BODY (Barcode)
        $html .= "<div class='label-body'>";
        $html .= $this->buildBarcodeHtml($label);
        $html .= "</div>"; // body

        // FOOTER
        $html .= "<div class='label-footer'>";

        if ($s->show_vendor && !empty($label['vendor'])) {
            $html .= "<div class='vendor'>" .
                htmlspecialchars($label['vendor']) .
                "</div>";
        }

        if ($s->show_product_type && !empty($label['product_type'])) {
            $html .= "<div class='product-type'>" .
                htmlspecialchars($label['product_type']) .
                "</div>";
        }

        $html .= "</div>"; // footer

        $html .= "</div>"; // label

        return $html;
    }

    protected function buildBarcodeHtml($label)
    {
        $s = $this->setting;
        $html = "<div class='barcode-container'>";

        $showLinear = $s->show_linear_barcode ?? true;
        $showQr = $s->show_qr_code ?? false;
        $showValue = $s->show_barcode_value ?? true;

        // Show linear barcode
        if ($showLinear && !empty($label['barcode_html'])) {
            $html .= "<img src='{$label['barcode_html']}' class='barcode-img' alt='Barcode' />";

            if ($showValue) {
                $html .= "<div class='barcode-value'>" .
                    htmlspecialchars($label['barcode_value']) .
                    "</div>";
            }
        }

        // Show QR code
        if ($showQr && !empty($label['qr_code'])) {
            $html .= "<img src='{$label['qr_code']}' class='qr-code' alt='QR Code' />";

            if ($showValue && !$showLinear) {
                $html .= "<div class='barcode-value'>" .
                    htmlspecialchars($label['barcode_value']) .
                    "</div>";
            }
        }

        // Fallback if no barcode available
        if (empty($label['barcode_html']) && empty($label['qr_code'])) {
            $html .= "<div class='barcode-value' style='padding: 5pt 0;'>" .
                htmlspecialchars($label['barcode_value']) .
                "</div>";
        }

        $html .= "</div>";

        return $html;
    }
}
