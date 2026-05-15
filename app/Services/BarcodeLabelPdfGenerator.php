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
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\ErrorCorrectionLevel;  // Correct import for v5.x
use Endroid\QrCode\RoundBlockSizeMode;
use Illuminate\Support\Facades\Log;
use Picqer\Barcode\BarcodeGeneratorPNG;

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
            $labels = $this->prepareLabels($variantIds, $quantityPerVariant);
            return $this->renderPdf($labels);
        } catch (\Exception $e) {
            Log::error('PDF Generation Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function generateRawPdf($variantIds, $quantityPerVariant = 1)
    {
        try {
            $labels = $this->prepareLabels($variantIds, $quantityPerVariant);
            return $this->renderPdfRaw($labels);
        } catch (\Exception $e) {
            Log::error('Raw PDF Generation Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    protected function prepareLabels($variantIds, $quantityPerVariant)
    {
        $variants = Variant::whereIn('id', $variantIds)
            ->with(['product.user'])
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
        return $labels;
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
        $finalValue = '';

        switch ($dataSource) {
            case 'sku':
                $finalValue = $variant->sku ?: "VAR-{$variant->id}";
                break;

            case 'variant_id':
                $finalValue = (string) $variant->shopify_variant_id;
                break;

            case 'product_url':
                $shop = $variant->product->user->name ?? '';
                $productHandle = $variant->product->handle ?? '';
                $variantId = $variant->shopify_variant_id ?? '';
                if ($shop && $productHandle) {
                    $finalValue = "https://{$shop}/products/{$productHandle}?variant={$variantId}";
                } else {
                    $finalValue = $variant->barcode ?: "VAR-{$variant->id}";
                }
                break;

            case 'custom':
                $finalValue = $this->parseCustomFormat($variant);
                break;

            case 'barcode':
            default:
                if (!empty($variant->barcode)) {
                    $finalValue = $variant->barcode;
                } else if (!empty($variant->sku)) {
                    $finalValue = $variant->sku;
                } else {
                    $finalValue = "VAR-{$variant->id}";
                }
                break;
        }

        Log::info('QR Code Data Source Resolution', [
            'selected_source' => $dataSource,
            'resolved_value' => $finalValue,
            'variant_attributes' => [
                'sku' => $variant->sku,
                'barcode' => $variant->barcode,
                'shopify_variant_id' => $variant->shopify_variant_id,
                'domain_from_user' => $variant->product->user->name ?? null,
                'product_handle' => $variant->product->handle ?? null,
            ]
        ]);

        return $finalValue;
    }

    protected function parseCustomFormat($variant)
    {
        $format = $this->setting->qr_custom_format ?? '{barcode}';

        // Support both {tag} and {{tag}} formats
        $replacements = [
            '{sku}' => $variant->sku ?? '',
            '{{sku}}' => $variant->sku ?? '',
            '{barcode}' => $variant->barcode ?? '',
            '{{barcode}}' => $variant->barcode ?? '',
            '{price}' => $variant->price ?? '0.00',
            '{{price}}' => $variant->price ?? '0.00',
            '{title}' => $variant->product->title ?? '',
            '{{title}}' => $variant->product->title ?? '',
            '{variant_id}' => $variant->shopify_variant_id ?? '',
            '{{variant_id}}' => $variant->shopify_variant_id ?? '',
            '{product_id}' => $variant->product->shopify_id ?? '',
            '{{product_id}}' => $variant->product->shopify_id ?? '',
            '{vendor}' => $variant->product->vendor ?? '',
            '{{vendor}}' => $variant->product->vendor ?? '',
            '{variant}' => $this->getVariantTitle($variant),
            '{{variant}}' => $this->getVariantTitle($variant),
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

            // Graceful fallback: if the variant's value can't satisfy the strict
            // numeric requirements of EAN-13 / UPC-A / EAN-8 / ITF-14, render
            // the original value as Code128 (which accepts any alphanumeric)
            // so the label still has a scannable barcode instead of a blank text fallback.
            if ($validatedValue === false) {
                Log::info('Barcode value incompatible with selected format; falling back to code128', [
                    'requested_type' => $barcodeType,
                    'value' => $value,
                ]);
                $barcodeType = 'code128';
                $validatedValue = trim($value);
            }

            $type = $this->mapBarcodeType($barcodeType);
            $scale = max(1, (int) ($this->setting->barcode_scale ?? 2));
            $thickness = max(30, (int) ($this->setting->barcode_line_width ?? 50));

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
                if (strlen($numeric) < 12)
                    return false;
                return $this->padOrTruncate($value, 13, '0');

            case 'ean8':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 7)
                    return false;
                return $this->padOrTruncate($value, 8, '0');

            case 'upca':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 11)
                    return false;
                return $this->padOrTruncate($value, 12, '0');

            case 'itf14':
                $numeric = preg_replace('/[^0-9]/', '', $value);
                if (strlen($numeric) < 13)
                    return false;
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
            $qrSizePixels = max(200, min(600, (int) ($minSize * 11.811)));

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
        // THERMAL FIX: If grid is 1x1, force paper size to match label size + margins
        // This prevents "small label on A4 page" issues if user didn't update paper settings
        $this->adjustPaperSizeForThermal();

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
            ->setOption('defaultMediaType', 'print')
            ->stream('barcode-labels.pdf', ['Attachment' => false]);
    }

    protected function renderPdfRaw($labels)
    {
        // THERMAL FIX: Same logic for Raw PDF
        $this->adjustPaperSizeForThermal();

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
            ->output();
    }

    protected function adjustPaperSizeForThermal()
    {
        $cols = (int) ($this->setting->labels_per_row ?? 1);
        $rows = (int) ($this->setting->labels_per_column ?? 1);

        // Heuristic: If 1x1 grid, assume Thermal/Single Label mode
        if ($cols === 1 && $rows === 1) {
            $labelW = floatval($this->setting->label_width);
            $labelH = floatval($this->setting->label_height);

            // Get effective margins EXACTLY matching buildHtml to prevent overflow
            $mT = floatval($this->setting->margin_top ?? $this->setting->page_margin_top ?? 0);
            $mB = floatval($this->setting->margin_bottom ?? $this->setting->page_margin_bottom ?? 0);
            $mL = floatval($this->setting->margin_left ?? $this->setting->page_margin_left ?? 0);
            $mR = floatval($this->setting->margin_right ?? $this->setting->page_margin_right ?? 0);

            // Force Paper Size = Label Size + Margins
            // This ensures the PDF page creates a canvas exactly the size of the sticker
            $this->setting->paper_width = $labelW + $mL + $mR;
            $this->setting->paper_height = $labelH + $mT + $mB;

            // Log this override for debugging
            Log::info("Thermal Mode Detected: Auto-sized PDF page to {$this->setting->paper_width}x{$this->setting->paper_height}mm");
        }
    }

    protected function calculateEffectiveDimensions()
    {
        $orientation = strtolower($this->setting->paper_orientation ?? 'portrait');
        $paperWidth = floatval($this->setting->paper_width ?? 210);
        $paperHeight = floatval($this->setting->paper_height ?? 297);

        if ($orientation === 'landscape') {
            return [
                'width' => $paperHeight,
                'height' => $paperWidth,
            ];
        }

        return [
            'width' => $paperWidth,
            'height' => $paperHeight,
        ];
    }

    protected function calculateMaxGrid()
    {
        $effective = $this->calculateEffectiveDimensions();
        $effectiveWidth = $effective['width'];
        $effectiveHeight = $effective['height'];

        $marginLeft = floatval($this->setting->margin_left ?? $this->setting->page_margin_left ?? 0);
        $marginRight = floatval($this->setting->margin_right ?? $this->setting->page_margin_right ?? 0);
        $marginTop = floatval($this->setting->margin_top ?? $this->setting->page_margin_top ?? 0);
        $marginBottom = floatval($this->setting->margin_bottom ?? $this->setting->page_margin_bottom ?? 0);

        $labelWidth = floatval($this->setting->label_width ?? 80);
        $labelHeight = floatval($this->setting->label_height ?? 40);

        $hGap = floatval($this->setting->label_spacing_horizontal ?? 0);
        $vGap = floatval($this->setting->label_spacing_vertical ?? 0);

        $availableWidth = $effectiveWidth - $marginLeft - $marginRight;
        $availableHeight = $effectiveHeight - $marginTop - $marginBottom;

        $maxCols = 0;
        do {
            $maxCols++;
            $requiredWidth = ($labelWidth * $maxCols) + ($hGap * ($maxCols - 1));
        } while ($requiredWidth <= $availableWidth + 0.1);  // Add epsilon
        $maxCols = max(1, $maxCols - 1);

        $maxRows = 0;
        do {
            $maxRows++;
            $requiredHeight = ($labelHeight * $maxRows) + ($vGap * ($maxRows - 1));
        } while ($requiredHeight <= $availableHeight + 0.1);  // Add epsilon
        $maxRows = max(1, $maxRows - 1);

        Log::info('PDF Grid Calculation', [
            'paper_dim' => [$effectiveWidth, $effectiveHeight],
            'avail_dim' => [$availableWidth, $availableHeight],
            'label_dim' => [$labelWidth, $labelHeight],
            'margins' => [$marginLeft, $marginRight, $marginTop, $marginBottom],
            'gap' => [$hGap, $vGap],
            'calc_max' => [$maxCols, $maxRows]
        ]);

        return [
            'max_cols' => $maxCols,
            'max_rows' => $maxRows,
        ];
    }

    protected function buildHtml($labels)
    {
        $s = $this->setting;

        // Detect Thermal Mode for CSS adjustments
        $cols = (int) ($s->labels_per_row ?? 1);
        $rows = (int) ($s->labels_per_column ?? 1);
        $isThermal = ($cols === 1 && $rows === 1);

        // Convert all measurements properly
        $labelWidth = floatval($s->label_width ?? 80) * self::MM_TO_PT;
        $labelHeight = floatval($s->label_height ?? 40) * self::MM_TO_PT;
        $hGap = floatval($s->label_spacing_horizontal ?? 5) * self::MM_TO_PT;
        $vGap = floatval($s->label_spacing_vertical ?? 5) * self::MM_TO_PT;

        // Fix: Frontend sends 'margin_top', backend might expect 'page_margin_top'
        // We check both, preferring the shorter 'margin_*' keys if available.
        $marginTop = floatval($s->margin_top ?? $s->page_margin_top ?? 0) * self::MM_TO_PT;
        $marginRight = floatval($s->margin_right ?? $s->page_margin_right ?? 0) * self::MM_TO_PT;
        $marginBottom = floatval($s->margin_bottom ?? $s->page_margin_bottom ?? 0) * self::MM_TO_PT;
        $marginLeft = floatval($s->margin_left ?? $s->page_margin_left ?? 0) * self::MM_TO_PT;

        $barcodeWidth = floatval($s->barcode_width ?? 60) * self::MM_TO_PT;
        $barcodeHeight = floatval($s->barcode_height ?? 20) * self::MM_TO_PT;

        // For QR codes, use the smaller dimension
        $qrSize = min($barcodeWidth, $barcodeHeight);

        // Calculate max grid just for logging/warning, but TRUST THE USER
        $grid = $this->calculateMaxGrid();
        $maxCols = $grid['max_cols'];
        $maxRows = $grid['max_rows'];

        $userCols = (int) ($s->labels_per_row ?? 0);
        $userRows = (int) ($s->labels_per_column ?? 0);

        // TRUST: If user specified columns/rows, use them. Otherwise fallback to calc.
        $cols = $userCols > 0 ? $userCols : $maxCols;
        $rows = $userRows > 0 ? $userRows : $maxRows;

        $cols = max(1, $cols);
        $rows = max(1, $rows);

        if ($userCols > $maxCols || $userRows > $maxRows) {
            Log::warning('Label grid exceeds calculated max (Trusting User)', [
                'requested' => "{$userCols}x{$userRows}",
                'calculated_max' => "{$maxCols}x{$maxRows}",
                'paper_size' => "{$s->paper_width}x{$s->paper_height} mm",
            ]);
        }

        $labelsPerPage = $cols * $rows;

        $fontSize = max(6, (int) ($s->font_size ?? 10));
        $titleSize = max(7, (int) ($s->title_font_size ?? 12));
        $fontColor = $s->font_color ?? '#000000';
        $fontFamily = $s->font_family ?? 'Arial';
        $titleBold = $s->title_bold ? 'bold' : 'normal';

        $labelPadding = max(2, min(6, $labelHeight * 0.04));

        // CSS: Hide border for thermal to prevent overflow/double-lines
        $borderStyle = $isThermal ? 'none' : '0.5pt solid #cccccc';

        $cssWidth = max(0, $labelWidth - ($labelPadding * 2));
        $cssHeight = max(0, $labelHeight - ($labelPadding * 2));

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

                    .label-grid-table {
                        border-collapse: collapse;
                    }

                    .label-content {
                        width: {$cssWidth}pt;
                        height: {$cssHeight}pt;
                        border: {$borderStyle};
                        padding: {$labelPadding}pt;
                        overflow: hidden;
                        display: block;
                        background: white;
                        position: relative;
                        box-sizing: content-box;
                    }

                    .label-header {
                        height: auto;
                        margin-bottom: 2pt;
                    }

                    .label-body {
                        height: auto;
                        text-align: center;
                        min-height: 40%;
                        /* Vertical centering is hard without flexbox or table, relying on natural stacking */
                    }

                    .label-footer {
                        height: auto;
                        margin-top: 1pt;
                        flex-shrink: 0; 
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
            $html .= "<div class='page'>";

            // Use a table for the grid to enforce layout strictly
            // collapse: separate is needed for border-spacing if we used it,
            // but we are using spacer cells/rows.
            $html .= "<table class='label-grid-table' style='width: auto; border-collapse: collapse; table-layout: fixed;'>";

            // Chunk into rows
            $gridRows = array_chunk($pageLabels, $cols);

            foreach ($gridRows as $rowIndex => $rowLabels) {
                $html .= '<tr>';
                foreach ($rowLabels as $colIndex => $label) {
                    $html .= "<td style='padding: 0; vertical-align: top;'>";
                    $html .= $this->buildLabelHtml($label);
                    $html .= '</td>';

                    // Add horizontal spacer if not last column
                    if ($colIndex < count($rowLabels) - 1) {
                        $html .= "<td style='width: {$hGap}pt; padding: 0;'></td>";
                    }
                }

                // Fill empty cells if row is incomplete (for border consistency if needed, generally not needed for layout unless background)
                $remainingCols = $cols - count($rowLabels);
                if ($remainingCols > 0) {
                    for ($i = 0; $i < $remainingCols; $i++) {
                        $html .= "<td style='width: {$hGap}pt; padding: 0;'></td>";  // gap
                        $html .= "<td style='width: {$labelWidth}pt; padding: 0;'></td>";  // empty label slot
                    }
                }

                $html .= '</tr>';

                // Add vertical spacer row if not last row and gap > 0
                if ($rowIndex < count($gridRows) - 1 && $vGap > 0.1) {
                    $html .= "<tr style='height: {$vGap}pt; line-height: 0;'><td colspan='" . ($cols * 2 - 1) . "' style='padding:0; height:{$vGap}pt;'></td></tr>";
                }
            }

            $html .= '</table></div>';
        }

        $html .= '</body></html>';

        return $html;
    }

    protected function buildLabelHtml($label)
    {
        $s = $this->setting;
        $html = "<div class='label-content'>";

        // Use custom text layout if configured
        $textLayout = $s->text_layout;

        // HEADER - Use text layout configuration
        $html .= "<div class='label-header'>";

        if (is_array($textLayout) && !empty($textLayout)) {
            usort($textLayout, fn($a, $b) => ($a['order'] ?? 0) - ($b['order'] ?? 0));

            foreach ($textLayout as $line) {
                if (!($line['enabled'] ?? true))
                    continue;

                $fontSize = $line['size'] ?? 10;
                $fontWeight = ($line['bold'] ?? false) ? 'bold' : 'normal';
                $value = $this->getFieldValue($label, $line['field']);

                if (empty($value))
                    continue;

                $html .= "<div style='font-size: {$fontSize}pt; font-weight: {$fontWeight}; line-height: 1.2; margin-bottom: 1pt;'>";
                $html .= htmlspecialchars($value);
                $html .= '</div>';
            }
        } else {
            // Fallback to old logic
            if ($s->show_product_title) {
                $html .= "<div class='product-title'>" . htmlspecialchars($label['product_title']) . '</div>';
            }
            if ($s->show_variant && $label['variant_title'] !== 'Default Title') {
                $html .= "<div class='variant-title'>" . htmlspecialchars($label['variant_title']) . '</div>';
            }
            if ($s->show_sku && !empty($label['sku'])) {
                $html .= "<div class='sku'>SKU: " . htmlspecialchars($label['sku']) . '</div>';
            }
            if ($s->show_price && !empty($label['price'])) {
                $html .= "<div class='price'>\$" . number_format((float) $label['price'], 2) . '</div>';
            }
        }

        $html .= '</div>';

        // BODY (Barcode/QR)
        $html .= "<div class='label-body'>";
        $html .= $this->buildBarcodeHtml($label);
        $html .= '</div>';

        // FOOTER
        $html .= "<div class='label-footer'>";
        if ($s->show_vendor && !empty($label['vendor'])) {
            $html .= "<div class='vendor'>" . htmlspecialchars($label['vendor']) . '</div>';
        }
        if ($s->show_product_type && !empty($label['product_type'])) {
            $html .= "<div class='product-type'>" . htmlspecialchars($label['product_type']) . '</div>';
        }
        $html .= '</div>';

        $html .= '</div>';

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
                return !empty($label['price']) ? '$' . number_format((float) $label['price'], 2) : '';
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
                $html .= "<div class='barcode-value'>" . htmlspecialchars($displayValue) . '</div>';
            }
        }
        // Show linear barcode
        elseif (!empty($label['barcode_html'])) {
            $html .= "<img src='{$label['barcode_html']}' class='barcode-img' alt='Barcode' />";

            if ($showValue) {
                $html .= "<div class='barcode-value'>" . htmlspecialchars($label['barcode_value']) . '</div>';
            }
        }
        // Fallback text
        else {
            $html .= "<div class='barcode-value' style='padding: 5pt 0; font-size: 9pt;'>"
                . htmlspecialchars($label['barcode_value'])
                . '</div>';
        }

        $html .= '</div>';

        return $html;
    }
}
