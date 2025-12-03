<?php

namespace App\Http\Controllers;

use App\Models\BarcodePrinterSetting;
use App\Models\LabelTemplate;
use App\Models\Variant;
use App\Services\BarcodeLabelPdfGenerator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class PrinterController extends Controller
{
    public function index()
    {
        try {
            $user = auth()->user();
            $setting = $user->barcodePrinterSettings()->first();

            if (!$setting) {
                $setting = $this->createDefaultSetting($user);
            }

            // Load user's templates
            $templates = $user->labelTemplates()
                ->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            // Get collections for filters
            $shopify = new \App\Services\ShopifyService($user);
            $collections = $shopify->getCollections() ?? [];

            // Get unique vendors and product types for filters
            $vendors = $user->products()
                ->whereNotNull('vendor')
                ->distinct()
                ->pluck('vendor')
                ->filter()
                ->values();

            $productTypes = $user->products()
                ->whereNotNull('product_type')
                ->distinct()
                ->pluck('product_type')
                ->filter()
                ->values();

            return Inertia::render('BarcodePrinter/Index', [
                'setting' => $setting,
                'templates' => $templates,
                'initialCollections' => $collections,
                'vendors' => $vendors,
                'productTypes' => $productTypes,
            ]);
        } catch (\Exception $e) {
            Log::error('Barcode printer index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return back()->with('error', 'Failed to load printer page');
        }
    }

    public function variants(Request $request)
    {
        try {
            $user = auth()->user();
            $page = max(1, (int)$request->input('page', 1));
            $perPage = (int)$request->input('per_page', 20);
            $tab = $request->input('tab', 'all');

            $query = Variant::with(['product'])
                ->whereHas('product', fn($q) => $q->where('user_id', $user->id));

            // Apply filters
            if ($request->filled('vendor')) {
                $query->whereHas(
                    'product',
                    fn($q) =>
                    $q->where('vendor', 'like', '%' . trim($request->vendor) . '%')
                );
            }

            if ($request->filled('type')) {
                $query->whereHas(
                    'product',
                    fn($q) =>
                    $q->where('product_type', 'like', '%' . trim($request->type) . '%')
                );
            }

            if ($request->filled('collections') && is_array($request->collections)) {
                $query->whereHas(
                    'product.collections',
                    fn($q) =>
                    $q->whereIn('collection_id', $request->collections)
                );
            }

            // Get all variants for stats before filtering by tab
            $allVariants = clone $query;
            $totalAll = $allVariants->count();
            $missingBarcodes = $allVariants->whereNull('barcode')->orWhere('barcode', '')->count();
            $withBarcodes = $totalAll - $missingBarcodes;

            // Filter by tab
            if ($tab === 'missing') {
                $query->where(function ($q) {
                    $q->whereNull('barcode')->orWhere('barcode', '');
                });
            } elseif ($tab === 'with_barcode') {
                $query->whereNotNull('barcode')->where('barcode', '!=', '');
            }

            // Search filter
            if ($request->filled('search')) {
                $search = strtolower(trim($request->search));
                $query->where(function ($q) use ($search) {
                    $q->where('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%")
                        ->orWhereHas('product', function ($pq) use ($search) {
                            $pq->where('title', 'like', "%{$search}%")
                                ->orWhere('vendor', 'like', "%{$search}%");
                        });
                });
            }

            // Get total after all filters
            $total = $query->count();

            // For "Apply to All" functionality
            if ($request->boolean('get_all_ids')) {
                return response()->json([
                    'all_variant_ids' => $query->pluck('id')->toArray(),
                ]);
            }

            // Paginate
            $variants = $query->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get()
                ->map(function ($variant) {
                    return $this->formatVariant($variant);
                });

            return response()->json([
                'variants' => $variants,
                'total' => $total,
                'current_page' => $page,
                'per_page' => $perPage,
                'last_page' => ceil($total / $perPage),
                'stats' => [
                    'all' => $totalAll,
                    'missing' => $missingBarcodes,
                    'with_barcode' => $withBarcodes,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Variants API error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to load variants',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateSetting(Request $request, $id)
    {
        try {
            $user = auth()->user();
            $setting = $user->barcodePrinterSettings()->findOrFail($id);

            $validated = $request->validate([
                // Label Design
                'label_name' => 'nullable|string|max:255',
                'barcode_type' => 'nullable|string',
                'barcode_format' => 'nullable|string',

                // Paper Setup
                'paper_size' => 'nullable|string',
                'paper_orientation' => 'nullable|in:portrait,landscape',
                'paper_width' => 'nullable|numeric|min:10|max:1000',
                'paper_height' => 'nullable|numeric|min:10|max:1000',

                // Margins
                'page_margin_top' => 'nullable|numeric|min:0|max:100',
                'page_margin_bottom' => 'nullable|numeric|min:0|max:100',
                'page_margin_left' => 'nullable|numeric|min:0|max:100',
                'page_margin_right' => 'nullable|numeric|min:0|max:100',

                // Label Dimensions
                'label_width' => 'nullable|numeric|min:10|max:500',
                'label_height' => 'nullable|numeric|min:10|max:500',

                // Layout
                'labels_per_row' => 'nullable|integer|min:1|max:20',
                'labels_per_column' => 'nullable|integer|min:1|max:50',
                'label_spacing_horizontal' => 'nullable|numeric|min:0|max:50',
                'label_spacing_vertical' => 'nullable|numeric|min:0|max:50',

                // Barcode Settings
                'barcode_width' => 'nullable|numeric|min:5|max:200',
                'barcode_height' => 'nullable|numeric|min:5|max:200',
                'barcode_scale' => 'nullable|integer|min:1|max:5',
                'barcode_line_width' => 'nullable|integer|min:30|max:150',
                'barcode_position' => 'nullable|in:top,center,bottom',

                // QR Code Settings
                'qr_error_correction' => 'nullable|integer|in:7,15,25,30',
                'qr_module_size' => 'nullable|integer|min:1|max:10',

                // Display Options
                'show_barcode_value' => 'nullable|boolean',
                'show_product_title' => 'nullable|boolean',
                'show_sku' => 'nullable|boolean',
                'show_price' => 'nullable|boolean',
                'show_variant' => 'nullable|boolean',
                'show_vendor' => 'nullable|boolean',
                'show_product_type' => 'nullable|boolean',
                'show_qr_code' => 'nullable|boolean',
                'show_linear_barcode' => 'nullable|boolean',

                // Typography
                'font_family' => 'nullable|string',
                'font_size' => 'nullable|integer|min:6|max:72',
                'font_color' => 'nullable|string',
                'title_font_size' => 'nullable|integer|min:8|max:72',
                'title_bold' => 'nullable|boolean',

                // Custom Fields
                'custom_fields' => 'nullable|array',
            ]);

            $setting->update($validated);

            return response()->json([
                'success' => true,
                'setting' => $setting,
                'message' => 'Settings updated successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Update setting error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to update settings',
                'message' => $e->getMessage()
            ], 500);
        }
    }



    // Template Management
    public function saveTemplate(Request $request)
    {
        try {
            $user = auth()->user();

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:1000',
                'settings' => 'required|array',
                'is_default' => 'nullable|boolean',
            ]);

            // If setting as default, unset other defaults
            if ($validated['is_default'] ?? false) {
                $user->labelTemplates()->update(['is_default' => false]);
            }

            $template = $user->labelTemplates()->create($validated);

            return response()->json([
                'success' => true,
                'template' => $template,
                'message' => 'Template saved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Save template error', ['error' => $e->getMessage()]);

            return response()->json([
                'error' => 'Failed to save template',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function loadTemplate(Request $request, $id)
    {
        try {
            $user = auth()->user();
            $template = $user->labelTemplates()->findOrFail($id);

            return response()->json([
                'success' => true,
                'settings' => $template->settings,
                'template' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Template not found'
            ], 404);
        }
    }

    public function deleteTemplate($id)
    {
        try {
            $user = auth()->user();
            $template = $user->labelTemplates()->findOrFail($id);
            $template->delete();

            return response()->json([
                'success' => true,
                'message' => 'Template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to delete template'
            ], 500);
        }
    }

    protected function formatVariant($variant)
    {
        $options = array_filter([
            $variant->option1,
            $variant->option2,
            $variant->option3,
        ]);

        $variantTitle = !empty($options) ? implode(' / ', $options) : 'Default Title';

        return [
            'id' => $variant->id,
            'title' => $variantTitle,
            'product_title' => $variant->product->title ?? 'Untitled Product',
            'sku' => $variant->sku ?? '',
            'barcode' => $variant->barcode ?? '',
            'price' => $variant->price ?? '0.00',
            'image' => $variant->image_src ?? $variant->image ?? '',
            'option1' => $variant->option1,
            'option2' => $variant->option2,
            'option3' => $variant->option3,
            'vendor' => $variant->product->vendor ?? '',
            'product_type' => $variant->product->product_type ?? '',
            'shopify_variant_id' => $variant->shopify_variant_id,
            'inventory_quantity' => $variant->inventory_quantity ?? 0,
        ];
    }

    protected function createDefaultSetting($user)
    {
        return $user->barcodePrinterSettings()->create([
            'label_name' => 'Default Label',
            'barcode_type' => 'code128',
            'barcode_format' => 'linear',

            'paper_size' => 'a4',
            'paper_orientation' => 'portrait',
            'paper_width' => 210,
            'paper_height' => 297,

            'page_margin_top' => 10,
            'page_margin_bottom' => 10,
            'page_margin_left' => 10,
            'page_margin_right' => 10,

            'label_width' => 80,
            'label_height' => 40,

            'labels_per_row' => 2,
            'labels_per_column' => 7,
            'label_spacing_horizontal' => 5,
            'label_spacing_vertical' => 5,

            'barcode_width' => 60,
            'barcode_height' => 20,
            'barcode_scale' => 2,
            'barcode_line_width' => 60,
            'barcode_position' => 'center',

            'qr_error_correction' => 15,
            'qr_module_size' => 5,

            'show_barcode_value' => true,
            'show_product_title' => true,
            'show_sku' => true,
            'show_price' => false,
            'show_variant' => true,
            'show_vendor' => false,
            'show_product_type' => false,
            'show_qr_code' => false,
            'show_linear_barcode' => true,

            'font_family' => 'Arial',
            'font_size' => 10,
            'font_color' => '#000000',
            'title_font_size' => 12,
            'title_bold' => true,
        ]);
    }


    protected function validateBarcodeForType($barcode, $type)
    {
        if (empty($barcode)) {
            return ['valid' => false, 'message' => 'Barcode cannot be empty'];
        }

        $type = strtolower($type);

        switch ($type) {
            case 'ean13':
                $numeric = preg_replace('/[^0-9]/', '', $barcode);
                if (strlen($numeric) < 12) {
                    return [
                        'valid' => false,
                        'message' => 'EAN-13 requires at least 12 digits'
                    ];
                }
                return ['valid' => true];

            case 'ean8':
                $numeric = preg_replace('/[^0-9]/', '', $barcode);
                if (strlen($numeric) < 7) {
                    return [
                        'valid' => false,
                        'message' => 'EAN-8 requires at least 7 digits'
                    ];
                }
                return ['valid' => true];

            case 'upca':
                $numeric = preg_replace('/[^0-9]/', '', $barcode);
                if (strlen($numeric) < 11) {
                    return [
                        'valid' => false,
                        'message' => 'UPC-A requires at least 11 digits'
                    ];
                }
                return ['valid' => true];

            case 'itf14':
                $numeric = preg_replace('/[^0-9]/', '', $barcode);
                if (strlen($numeric) < 13) {
                    return [
                        'valid' => false,
                        'message' => 'ITF-14 requires at least 13 digits'
                    ];
                }
                return ['valid' => true];

            case 'code39':
            case 'code93':
                // Alphanumeric only
                if (!preg_match('/^[A-Z0-9\-\.\ \$\/\+\%]+$/i', $barcode)) {
                    return [
                        'valid' => false,
                        'message' => strtoupper($type) . ' only supports alphanumeric characters and -.$/%+ '
                    ];
                }
                return ['valid' => true];

            case 'codabar':
                $numeric = preg_replace('/[^0-9]/', '', $barcode);
                if (empty($numeric)) {
                    return [
                        'valid' => false,
                        'message' => 'CODABAR requires numeric characters'
                    ];
                }
                return ['valid' => true];

            case 'code128':
            case 'qr':
            case 'datamatrix':
            default:
                // These support any characters
                return ['valid' => true];
        }
    }

    // Update the generatePdf method to include validation
    public function generatePdf(Request $request)
    {
        try {
            $user = auth()->user();

            $validated = $request->validate([
                'setting_id' => 'required|exists:barcode_printer_settings,id',
                'variant_ids' => 'required|array|min:1|max:1000',
                'variant_ids.*' => 'integer|exists:variants,id',
                'quantity_per_variant' => 'nullable|integer|min:1|max:100',
            ]);

            $setting = $user->barcodePrinterSettings()->findOrFail($validated['setting_id']);

            // Verify all variants belong to user
            $variants = Variant::whereIn('id', $validated['variant_ids'])
                ->whereHas('product', fn($q) => $q->where('user_id', $user->id))
                ->with('product')
                ->get();

            if ($variants->isEmpty()) {
                return response()->json([
                    'error' => 'No valid variants found'
                ], 400);
            }

            // Validate barcodes for the selected type
            $invalidBarcodes = [];
            foreach ($variants as $variant) {
                $barcodeValue = $variant->barcode ?? $variant->sku ?? "VAR-{$variant->id}";
                $validation = $this->validateBarcodeForType($barcodeValue, $setting->barcode_type);

                if (!$validation['valid']) {
                    $invalidBarcodes[] = [
                        'variant' => $variant->product->title . ' - ' . ($variant->sku ?? 'No SKU'),
                        'barcode' => $barcodeValue,
                        'reason' => $validation['message']
                    ];
                }
            }

            // If there are invalid barcodes, return warning but continue
            if (!empty($invalidBarcodes) && count($invalidBarcodes) < 10) {
                Log::warning('Some barcodes may not be valid for the selected type', [
                    'invalid_count' => count($invalidBarcodes),
                    'type' => $setting->barcode_type,
                    'invalid_barcodes' => $invalidBarcodes
                ]);
            }

            $pdfGenerator = new BarcodeLabelPdfGenerator($setting);

            return $pdfGenerator->generatePdf(
                $variants->pluck('id')->toArray(),
                $validated['quantity_per_variant'] ?? 1
            );
        } catch (\Throwable $e) {
            Log::error('PDF Generation Failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'PDF generation failed',
                'message' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }
}
