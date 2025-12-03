<?php

namespace App\Http\Controllers;

use App\Models\BarcodePrinterSetting;
use App\Models\Product;
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

            return Inertia::render('BarcodePrinter/Index', [
                'setting' => $setting,
            ]);
        } catch (\Exception $e) {
            Log::error('Barcode printer index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            abort(500, 'Failed to load page');
        }
    }

    public function products(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                Log::error('Products API: No authenticated user');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            Log::info('📦 Products API called', [
                'user_id' => $user->id,
                'user_email' => $user->email ?? 'N/A'
            ]);

            // Get products
            $productsQuery = Product::where('user_id', $user->id);
            $productsCount = $productsQuery->count();

            Log::info("Found {$productsCount} products for user {$user->id}");

            // In PrinterController.php -> products() method
            $products = $productsQuery->get()->map(function ($product) {
                $variants = collect($product->variants ?? [])->map(function ($variant) {
                    // Build full variant title like Shopify: "Default Title" or "Red / Large / Cotton"
                    $optionParts = array_filter([
                        $variant->option1,
                        $variant->option2,
                        $variant->option3,
                    ]);
                    $variantTitle = !empty($optionParts) ? implode(' / ', $optionParts) : 'Default Title';

                    return [
                        'id' => $variant->id,
                        'title' => $variantTitle,                    // Critical: matches SkuPreviewTable
                        'sku' => $variant->sku ?? '',                // Will show new SKU after generation
                        'barcode' => $variant->barcode ?? '',
                        'price' => $variant->price ?? '0.00',
                        'image' => $variant->image_src ?? $variant->image ?? '', // Use image_src first
                        'option1' => $variant->option1,
                        'option2' => $variant->option2,
                        'option3' => $variant->option3,
                        'product_title' => $product->title ?? 'Untitled Product',
                        'vendor' => $product->vendor ?? '',
                    ];
                })->values()->toArray();

                return [
                    'id' => $product->id,
                    'title' => $product->title ?? 'Untitled',
                    'vendor' => $product->vendor ?? '',
                    'type' => $product->product_type ?? '',
                    'variants' => $variants,
                ];
            })->values()->toArray();

            $totalVariants = array_sum(array_map(fn($p) => count($p['variants']), $products));

            Log::info('✅ Products loaded successfully', [
                'products_count' => count($products),
                'total_variants' => $totalVariants
            ]);

            return response()->json($products, 200);
        } catch (\Exception $e) {
            Log::error('❌ Products API CRITICAL ERROR', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile()),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'error' => 'Failed to load products',
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => basename($e->getFile()),
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

                // Return a mock PDF for testing
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

    public function storeTemplate(Request $request)
    {
        try {
            $user = auth()->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $data = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'settings' => 'required|array',
            ]);

            $template = $user->labelTemplates()->create($data);

            Log::info('Template created', ['template_id' => $template->id]);

            return response()->json(['success' => true, 'template' => $template]);
        } catch (\Exception $e) {
            Log::error('Store template error', [
                'error' => $e->getMessage()
            ]);
            return response()->json(['error' => 'Failed to save template'], 500);
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
