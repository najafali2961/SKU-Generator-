<?php
// ==============================================================================
// FILE: app/Services/BarcodeLabelPdfGenerator.php (FIXED FOR ENDROID 5.0.7)
// ==============================================================================

namespace App\Services;

use App\Models\BarcodePrinterSetting;
use App\Models\Variant;
use Barryvdh\DomPDF\Facade\Pdf;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel; // Correct import for v5.x
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Picqer\Barcode\BarcodeGeneratorPNG;
use Illuminate\Support\Facades\Log;

class BarcodeLabelPdfGenerator
{
    protected $setting;
    protected $barcodeGenerator;

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
        $barcodeValue = $this->getQrDataValue($variant);

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

        // Determine what to show based on barcode_type setting
        $barcodeType = strtolower($this->setting->barcode_type ?? 'code128');

        if (in_array($barcodeType, ['qr', 'datamatrix'])) {
            // Generate QR/Data Matrix
            $data['qr_code'] = $this->generateQrCode($barcodeValue);
            $data['barcode_html'] = null;
        } else {
            // Generate linear barcode
            $data['barcode_html'] = $this->generateBarcode($barcodeValue);
            $data['qr_code'] = null;
        }

        return $data;
    }

    protected function getQrDataValue($variant)
    {
        $dataSource = $this->setting->qr_data_source ?? 'barcode';

        switch ($dataSource) {
            case 'sku':
                return $variant->sku ?: "VAR-{$variant->id}";

            case 'variant_id':
                return (string)$variant->shopify_variant_id;

            case 'product_url':
                $shop = $variant->product->user->shopify_domain ?? '';
                $productId = $variant->product->shopify_product_id ?? '';
                $variantId = $variant->shopify_variant_id ?? '';
                if ($shop && $productId) {
                    return "https://{$shop}/products/{$productId}?variant={$variantId}";
                }
                return $variant->barcode ?: "VAR-{$variant->id}";

            case 'custom':
                return $this->parseCustomFormat($variant);

            case 'barcode':
            default:
                if (!empty($variant->barcode)) {
                    return $variant->barcode;
                }
                if (!empty($variant->sku)) {
                    return $variant->sku;
                }
                return "VAR-{$variant->id}";
        }
    }

    protected function parseCustomFormat($variant)
    {
        $format = $this->setting->qr_custom_format ?? '{barcode}';

        $replacements = [
            '{sku}' => $variant->sku ?? '',
            '{barcode}' => $variant->barcode ?? '',
            '{price}' => $variant->price ?? '0.00',
            '{title}' => $variant->product->title ?? '',
            '{variant_id}' => $variant->shopify_variant_id ?? '',
            '{product_id}' => $variant->product->shopify_product_id ?? '',
            '{vendor}' => $variant->product->vendor ?? '',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $format);
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

    protected function generateBarcode($value)
    {
        try {
            if (empty(trim($value))) {
                return $this->generateFallbackBarcode('NO BARCODE');
            }

            $barcodeType = strtolower($this->setting->barcode_type);

            // Validate based on barcode type
            $validatedValue = $this->validateAndFormatBarcode($value, $barcodeType);

            if ($validatedValue === false) {
                Log::warning("Invalid barcode format", [
                    'type' => $barcodeType,
                    'value' => $value
                ]);
                return $this->generateFallbackBarcode($value);
            }

            $type = $this->mapBarcodeType($barcodeType);
            $scale = max(1, (int)($this->setting->barcode_scale ?? 2));
            $thickness = max(30, (int)($this->setting->barcode_line_width ?? 50));

            $barcodeImage = $this->barcodeGenerator->getBarcode(
                $validatedValue,
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

    protected function validateAndFormatBarcode($value, $type)
    {
        switch ($type) {
            case 'ean13':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 12) return false;
                return $this->padOrTruncate($value, 13, '0');

            case 'ean8':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 7) return false;
                return $this->padOrTruncate($value, 8, '0');

            case 'upca':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 11) return false;
                return $this->padOrTruncate($value, 12, '0');

            case 'itf14':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 13) return false;
                return $this->padOrTruncate($value, 14, '0');

            case 'code39':
                $value = strtoupper($value);
                $value = preg_replace('/[^A-Z0-9\-\.\ \$\/\+\%]/', '', $value);
                return !empty($value) ? $value : false;

            case 'code93':
                $value = strtoupper($value);
                $value = preg_replace('/[^A-Z0-9\-\.\ \$\/\+\%]/', '', $value);
                return !empty($value) ? $value : false;

            case 'codabar':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                return !empty($numeric) ? $numeric : false;

            case 'code128':
            default:
                return !empty(trim($value)) ? trim($value) : false;
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
            // Calculate QR code size based on label dimensions
            $minSize = min(
                $this->setting->barcode_width ?? 30,
                $this->setting->barcode_height ?? 30
            );

            // Convert mm to pixels (300 DPI)
            $qrSizePixels = max(200, min(600, (int)($minSize * 11.811)));

            // FIX: In Endroid 5.x, ErrorCorrectionLevel is an Enum
            // Use the enum case directly instead of Medium constant
            $errorLevel = ErrorCorrectionLevel::Medium;

            $result = Builder::create()
                ->writer(new PngWriter())
                ->data($value)
                ->encoding(new Encoding('UTF-8'))
                ->errorCorrectionLevel($errorLevel)
                ->size($qrSizePixels)
                ->margin(5)
                ->roundBlockSizeMode(RoundBlockSizeMode::Margin)
                ->build();

            return 'data:image/png;base64,' . base64_encode($result->getString());
        } catch (\Throwable $e) {
            Log::error('QR code generation failed', [
                'value' => $value,
                'error' => $e->getMessage(),
            ]);

            return $this->generateQrFallback($value);
        }
    }

    protected function generateQrFallback($text)
    {
        $size = 200;
        $image = imagecreate($size, $size);
        $white = imagecolorallocate($image, 255, 255, 255);
        $black = imagecolorallocate($image, 0, 0, 0);

        imagefilledrectangle($image, 0, 0, $size, $size, $white);
        imagerectangle($image, 10, 10, $size - 10, $size - 10, $black);

        $fontSize = 3;
        $lines = str_split($text, 15);
        $y = ($size / 2) - (count($lines) * imagefontheight($fontSize) / 2);

        foreach ($lines as $line) {
            $textWidth = imagefontwidth($fontSize) * strlen($line);
            $x = ($size - $textWidth) / 2;
            imagestring($image, $fontSize, $x, $y, $line, $black);
            $y += imagefontheight($fontSize) + 2;
        }

        ob_start();
        imagepng($image);
        $imageData = ob_get_clean();
        imagedestroy($image);

        return 'data:image/png;base64,' . base64_encode($imageData);
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

        return $typeMap[strtolower($type)] ?? BarcodeGeneratorPNG::TYPE_CODE_128;
    }

    protected function renderPdf($labels)
    {
        $html = $this->buildHtml($labels);

        $paperSize = [
            0,
            0,
            floatval($this->setting->paper_width) * self::MM_TO_PT,
            floatval($this->setting->paper_height) * self::MM_TO_PT
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

        // Convert all measurements properly
        $labelWidth = floatval($s->label_width ?? 80) * self::MM_TO_PT;
        $labelHeight = floatval($s->label_height ?? 40) * self::MM_TO_PT;
        $hGap = floatval($s->label_spacing_horizontal ?? 5) * self::MM_TO_PT;
        $vGap = floatval($s->label_spacing_vertical ?? 5) * self::MM_TO_PT;

        $marginTop = floatval($s->page_margin_top ?? 10) * self::MM_TO_PT;
        $marginRight = floatval($s->page_margin_right ?? 10) * self::MM_TO_PT;
        $marginBottom = floatval($s->page_margin_bottom ?? 10) * self::MM_TO_PT;
        $marginLeft = floatval($s->page_margin_left ?? 10) * self::MM_TO_PT;

        $barcodeWidth = floatval($s->barcode_width ?? 60) * self::MM_TO_PT;
        $barcodeHeight = floatval($s->barcode_height ?? 20) * self::MM_TO_PT;

        // For QR codes, use the smaller dimension
        $qrSize = min($barcodeWidth, $barcodeHeight);

        $cols = max(1, (int)($s->labels_per_row ?? 2));
        $rows = max(1, (int)($s->labels_per_column ?? 7));
        $labelsPerPage = $cols * $rows;

        $fontSize = max(6, (int)($s->font_size ?? 10));
        $titleSize = max(7, (int)($s->title_font_size ?? 12));
        $fontColor = $s->font_color ?? '#000000';
        $fontFamily = $s->font_family ?? 'Arial';
        $titleBold = $s->title_bold ? 'bold' : 'normal';

        $labelPadding = max(2, min(6, $labelHeight * 0.04));

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
            background: white;
        }

        .label-header {
            flex-shrink: 0;
            margin-bottom: 2pt;
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
            max-width: {$barcodeWidth}pt !important;
            max-height: {$barcodeHeight}pt !important;
            width: auto !important;
            height: auto !important;
            display: block;
            margin: 0 auto;
        }

        .qr-code {
            width: {$qrSize}pt !important;
            height: {$qrSize}pt !important;
            display: block;
            margin: 0 auto;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
            -ms-interpolation-mode: nearest-neighbor;
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

        // Use custom text layout if configured
        $textLayout = $s->text_layout ?? $this->getDefaultTextLayout();

        // HEADER - Use text layout configuration
        $html .= "<div class='label-header'>";

        if (is_array($textLayout) && !empty($textLayout)) {
            usort($textLayout, fn($a, $b) => ($a['order'] ?? 0) - ($b['order'] ?? 0));

            foreach ($textLayout as $line) {
                if (!($line['enabled'] ?? true)) continue;

                $fontSize = $line['size'] ?? 10;
                $fontWeight = ($line['bold'] ?? false) ? 'bold' : 'normal';
                $value = $this->getFieldValue($label, $line['field']);

                if (empty($value)) continue;

                $html .= "<div style='font-size: {$fontSize}pt; font-weight: {$fontWeight}; line-height: 1.2; margin-bottom: 1pt;'>";
                $html .= htmlspecialchars($value);
                $html .= "</div>";
            }
        } else {
            // Fallback to old logic
            if ($s->show_product_title) {
                $html .= "<div class='product-title'>" . htmlspecialchars($label['product_title']) . "</div>";
            }
            if ($s->show_variant && $label['variant_title'] !== 'Default Title') {
                $html .= "<div class='variant-title'>" . htmlspecialchars($label['variant_title']) . "</div>";
            }
            if ($s->show_sku && !empty($label['sku'])) {
                $html .= "<div class='sku'>SKU: " . htmlspecialchars($label['sku']) . "</div>";
            }
            if ($s->show_price && !empty($label['price'])) {
                $html .= "<div class='price'>$" . number_format((float)$label['price'], 2) . "</div>";
            }
        }

        $html .= "</div>";

        // BODY (Barcode/QR)
        $html .= "<div class='label-body'>";
        $html .= $this->buildBarcodeHtml($label);
        $html .= "</div>";

        // FOOTER
        $html .= "<div class='label-footer'>";
        if ($s->show_vendor && !empty($label['vendor'])) {
            $html .= "<div class='vendor'>" . htmlspecialchars($label['vendor']) . "</div>";
        }
        if ($s->show_product_type && !empty($label['product_type'])) {
            $html .= "<div class='product-type'>" . htmlspecialchars($label['product_type']) . "</div>";
        }
        $html .= "</div>";

        $html .= "</div>";

        return $html;
    }

    protected function getDefaultTextLayout()
    {
        return [
            ['field' => 'title', 'size' => 12, 'bold' => true, 'enabled' => true, 'order' => 1],
            ['field' => 'variant', 'size' => 10, 'bold' => false, 'enabled' => true, 'order' => 2],
            ['field' => 'sku', 'size' => 9, 'bold' => false, 'enabled' => true, 'order' => 3],
            ['field' => 'price', 'size' => 11, 'bold' => true, 'enabled' => false, 'order' => 4],
        ];
    }

    protected function getFieldValue($label, $field)
    {
        switch ($field) {
            case 'title':
                return $label['product_title'];
            case 'variant':
                return $label['variant_title'] !== 'Default Title' ? $label['variant_title'] : '';
            case 'sku':
                return !empty($label['sku']) ? "SKU: {$label['sku']}" : '';
            case 'price':
                return !empty($label['price']) ? "$" . number_format((float)$label['price'], 2) : '';
            case 'vendor':
                return $label['vendor'] ?? '';
            case 'product_type':
                return $label['product_type'] ?? '';
            default:
                return '';
        }
    }

    protected function buildBarcodeHtml($label)
    {
        $s = $this->setting;
        $html = "<div class='barcode-container'>";

        $showValue = $s->show_barcode_value ?? true;

        // Show QR code
        if (!empty($label['qr_code'])) {
            $html .= "<img src='{$label['qr_code']}' class='qr-code' alt='QR Code' />";

            if ($showValue) {
                $displayValue = $label['barcode_value'];
                if (strlen($displayValue) > 30) {
                    $displayValue = substr($displayValue, 0, 30) . '...';
                }
                $html .= "<div class='barcode-value'>" . htmlspecialchars($displayValue) . "</div>";
            }
        }
        // Show linear barcode
        elseif (!empty($label['barcode_html'])) {
            $html .= "<img src='{$label['barcode_html']}' class='barcode-img' alt='Barcode' />";

            if ($showValue) {
                $html .= "<div class='barcode-value'>" . htmlspecialchars($label['barcode_value']) . "</div>";
            }
        }
        // Fallback text
        else {
            $html .= "<div class='barcode-value' style='padding: 5pt 0; font-size: 9pt;'>" .
                htmlspecialchars($label['barcode_value']) .
                "</div>";
        }

        $html .= "</div>";

        return $html;
    }
}
