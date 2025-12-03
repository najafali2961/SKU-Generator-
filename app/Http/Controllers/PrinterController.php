<?php

namespace App\Http\Controllers;

use App\Models\BarcodePrinterSetting;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

            // Get collections for filters
            $shopify = new \App\Services\ShopifyService($user);
            $collections = $shopify->getCollections() ?? [];

            return Inertia::render('BarcodePrinter/Index', [
                'setting' => $setting,
                'initialCollections' => $collections,
            ]);
        } catch (\Exception $e) {
            Log::error('Barcode printer index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            abort(500, 'Failed to load page');
        }
    }

    public function variants(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                Log::error('Variants API: No authenticated user');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $page = max(1, (int)$request->input('page', 1));
            $perPage = 8;
            $tab = $request->input('tab', 'all');


            // Build query for variants
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

            if ($request->filled('collections') && is_array($request->collections) && count($request->collections)) {
                $query->whereHas(
                    'product.collections',
                    fn($q) =>
                    $q->whereIn('collection_id', $request->collections)
                );
            }

            // Get all variants for stats
            $allVariants = $query->get();

            // Calculate stats
            $missingBarcodes = $allVariants->filter(fn($v) => empty($v->barcode))->count();
            $withBarcodes = $allVariants->filter(fn($v) => !empty($v->barcode))->count();

            // Filter by tab
            if ($tab === 'missing') {
                $allVariants = $allVariants->filter(fn($v) => empty($v->barcode));
            } elseif ($tab === 'with_barcode') {
                $allVariants = $allVariants->filter(fn($v) => !empty($v->barcode));
            }

            // Search filter
            if ($request->filled('search')) {
                $searchTerm = strtolower(trim($request->search));
                $allVariants = $allVariants->filter(function ($variant) use ($searchTerm) {
                    return str_contains(strtolower($variant->product->title ?? ''), $searchTerm) ||
                        str_contains(strtolower($variant->sku ?? ''), $searchTerm) ||
                        str_contains(strtolower($variant->barcode ?? ''), $searchTerm) ||
                        str_contains(strtolower($variant->product->vendor ?? ''), $searchTerm);
                });
            }

            $total = $allVariants->count();

            // Paginate
            $variants = $allVariants->slice(($page - 1) * $perPage, $perPage)->values();

            // Format variants
            $formattedVariants = $variants->map(function ($variant) {
                $optionParts = array_filter([
                    $variant->option1,
                    $variant->option2,
                    $variant->option3,
                ]);
                $variantTitle = !empty($optionParts) ? implode(' / ', $optionParts) : 'Default Title';

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
            });

            $visibleIds = $formattedVariants->pluck('id')->toArray();

            // If requesting all IDs for "Apply to All"
            if ($request->boolean('get_all_ids')) {
                return response()->json([
                    'all_variant_ids' => $allVariants->pluck('id')->toArray(),
                ]);
            }

            return response()->json([
                'variants' => $formattedVariants,
                'total' => $total,
                'visibleIds' => $visibleIds,
                'stats' => [
                    'missing' => $missingBarcodes,
                    'with_barcode' => $withBarcodes,
                    'all' => $allVariants->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Variants API CRITICAL ERROR', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile()),
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

            $data = $request->validate([
                // Label Design
                'label_name' => 'nullable|string|max:255',
                'barcode_type' => 'nullable|string',

                // Paper Setup
                'paper_size' => 'nullable|string',
                'paper_orientation' => 'nullable|string',
                'paper_width' => 'nullable|numeric',
                'paper_height' => 'nullable|numeric',

                // Margins
                'margin_top' => 'nullable|numeric',
                'margin_bottom' => 'nullable|numeric',
                'margin_left' => 'nullable|numeric',
                'margin_right' => 'nullable|numeric',

                // Label Dimensions
                'label_width' => 'nullable|numeric|min:10|max:500',
                'label_height' => 'nullable|numeric|min:10|max:500',

                // Layout
                'labels_per_row' => 'nullable|integer|min:1|max:10',
                'labels_per_column' => 'nullable|integer|min:1|max:20',
                'label_spacing_horizontal' => 'nullable|numeric',
                'label_spacing_vertical' => 'nullable|numeric',

                // Barcode Settings
                'barcode_width' => 'nullable|numeric',
                'barcode_height' => 'nullable|numeric',
                'barcode_position' => 'nullable|string',
                'show_barcode_value' => 'nullable|boolean',

                // Attributes
                'show_title' => 'nullable|boolean',
                'show_sku' => 'nullable|boolean',
                'show_price' => 'nullable|boolean',
                'show_variant' => 'nullable|boolean',
                'show_vendor' => 'nullable|boolean',
                'show_product_type' => 'nullable|boolean',

                // Typography
                'font_family' => 'nullable|string',
                'font_size' => 'nullable|integer',
                'font_color' => 'nullable|string',
                'title_font_size' => 'nullable|integer',
                'title_bold' => 'nullable|boolean',
            ]);

            $setting->update($data);

            Log::info('Setting updated', ['setting_id' => $id]);

            return response()->json(['success' => true, 'setting' => $setting]);
        } catch (\Exception $e) {
            Log::error('Update setting error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update settings'], 500);
        }
    }

    public function generatePdf(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $validated = $request->validate([
                'setting_id' => 'required|exists:barcode_printer_settings,id',
                'variant_ids' => 'required|array|min:1',
                'quantity_per_variant' => 'integer|min:1',
            ]);

            $setting = $user->barcodePrinterSettings()->findOrFail($validated['setting_id']);

            Log::info('Generating PDF', [
                'variant_count' => count($validated['variant_ids']),
                'quantity' => $validated['quantity_per_variant']
            ]);

            // Check if service exists
            if (!class_exists(\App\Services\BarcodeLabelPdfGenerator::class)) {
                Log::warning('PDF Generator service not found, returning mock response');

                return response()->json([
                    'message' => 'PDF service not configured yet. Please create app/Services/BarcodeLabelPdfGenerator.php',
                    'settings' => $setting,
                    'variants' => $validated['variant_ids']
                ], 501);
            }

            $pdfGenerator = new \App\Services\BarcodeLabelPdfGenerator($setting);
            return $pdfGenerator->generatePdf(
                $validated['variant_ids'],
                $validated['quantity_per_variant']
            );
        } catch (\Exception $e) {
            Log::error('PDF generation error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to generate PDF'], 500);
        }
    }

    private function createDefaultSetting($user)
    {
        return $user->barcodePrinterSettings()->create([
            // Label Design
            'label_name' => 'Default Label',
            'barcode_type' => 'code128',

            // Paper Setup
            'paper_size' => 'a4',
            'paper_orientation' => 'portrait',
            'paper_width' => 210,
            'paper_height' => 297,

            // Margins
            'margin_top' => 10,
            'margin_bottom' => 10,
            'margin_left' => 10,
            'margin_right' => 10,

            // Label Dimensions
            'label_width' => 80,
            'label_height' => 40,

            // Layout
            'labels_per_row' => 2,
            'labels_per_column' => 5,
            'label_spacing_horizontal' => 5,
            'label_spacing_vertical' => 5,

            // Barcode Settings
            'barcode_width' => 60,
            'barcode_height' => 20,
            'barcode_position' => 'center',
            'show_barcode_value' => true,

            // Attributes
            'show_product_title' => true,
            'show_sku' => true,
            'show_price' => false,
            'show_variant' => true,
            'show_vendor' => false,
            'show_product_type' => false,

            // Typography
            'font_family' => 'Arial',
            'font_size' => 10,
            'font_color' => '#000000',
            'title_font_size' => 12,
            'title_bold' => true,
        ]);
    }
}
