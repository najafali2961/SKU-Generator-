<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Jobs\GenerateBarcodeJob;
use App\Jobs\ImportBarcodesJob;
use App\Models\JobLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BarcodeController extends Controller
{
    public function index()
    {
        $shop = Auth::user();
        $shopify = new \App\Services\ShopifyService($shop);
        $collections = $shopify->getCollections() ?? [];

        $variants = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->latest()
            ->take(20)
            ->get();

        return inertia('BarcodeGenerator', [
            'initialVariants' => $variants->map(fn($v) => [
                'id' => $v->id,
                'title' => $v->product->title ?? 'Unknown',
                'variant_title' => $v->title,
                'sku' => $v->sku,
                'barcode' => $v->barcode,
                'image_url' => $v->image ?? ($v->product->images[0]['src'] ?? null),
            ]),
            'initialCollections' => $collections,
        ]);
    }

    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = strtoupper(trim($rules['prefix'] ?? ''));
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;
        $allow_qr_text = $rules['allow_qr_text'] ?? false;

        if ($format === 'QR') {
            return $allow_qr_text
                ? ($variant->sku ?: "https://yourstore.com/products/{$variant->product->handle}")
                : 'QR-' . strtoupper(\Str::random(12));
        }

        if ($format === 'CODE128') {
            $code = $prefix . ($variant->sku ?: "V{$variant->id}");
            return $numeric_only ? preg_replace('/\D/', '', $code) : $code;
        }

        // UPC / EAN / ISBN
        $targetLength = $format === 'UPC' ? 12 : 13;
        $base = $prefix . ($variant->sku ? preg_replace('/\D/', '', $variant->sku) : $variant->id . $counter);

        if ($numeric_only) {
            $base = preg_replace('/\D/', '', $base);
        }

        $code = substr($base, 0, $targetLength - ($checksum ? 1 : 0));

        if ($auto_fill) {
            $code = str_pad($code, $targetLength - ($checksum ? 1 : 0), '0', STR_PAD_LEFT);
        }

        if ($checksum) {
            $code .= $this->calculateCheckDigit($code, $targetLength);
        }

        return $code;
    }

    private function calculateCheckDigit($number, $length = 12)
    {
        $number = preg_replace('/\D/', '', $number);
        $number = str_pad($number, $length === 12 ? 11 : 12, '0', STR_PAD_LEFT);

        $sum = 0;
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $weight = ($i % 2 === ($length === 12 ? 1 : 0)) ? 3 : 1;
            $sum += $number[$i] * $weight;
        }

        $check = (10 - ($sum % 10)) % 10;
        return $check;
    }

    public function apply(Request $request)
    {
        $shop = Auth::user();

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'barcode_generation',
            'title' => 'Barcode Generation',
            'description' => 'Generating barcodes for ' . ($request->apply_scope === 'selected' ? 'selected' : 'all') . ' variants...',
            'payload' => $request->all(),
            'status' => 'pending',
        ]);
        $jobLog->markAsStarted();

        GenerateBarcodeJob::dispatch($shop->id, $request->all(), $jobLog->id);

        return redirect()->route('jobs.show', $jobLog->id)
            ->with('success', 'Barcode generation started! You\'ll be redirected to the progress page...');
    }

    /**
     * ✅ BUILD FILTERED QUERY WITH ALL FILTERS APPLIED
     */
    private function buildFilteredQuery(Request $request, $shop)
    {
        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Apply vendor filter
        if ($request->filled('vendor')) {
            $vendor = trim($request->vendor);
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', '%' . $vendor . '%'));
        }

        // Apply product type filter
        if ($request->filled('type')) {
            $type = trim($request->type);
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', '%' . $type . '%'));
        }

        // Apply collections filter
        if ($request->filled('collections') && is_array($request->collections) && count($request->collections)) {
            $collectionIds = array_filter($request->collections);
            if (count($collectionIds) > 0) {
                $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $collectionIds));
            }
        }

        // Apply tags filter (supports comma-separated AND individual tags)
        if ($request->filled('tags')) {
            $tags = $request->tags;

            // If it's a string (comma-separated), split it
            if (is_string($tags)) {
                $tags = array_map(
                    fn($t) => trim($t),
                    explode(',', $tags)
                );
            }

            // Filter out empty strings
            $tags = array_filter($tags, fn($t) => strlen($t) > 0);

            if (count($tags) > 0) {
                $query->whereHas('product', function ($q) use ($tags) {
                    foreach ($tags as $tag) {
                        $q->where('tags', 'LIKE', '%' . trim($tag) . '%');
                    }
                });
            }
        }

        return $query;
    }

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = 25;
        $tab     = $request->input('tab', 'all');

        // ✅ BUILD BASE QUERY WITH ALL FILTERS
        $baseQuery = $this->buildFilteredQuery($request, $shop);

        // ✅ GET ALL FILTERED VARIANTS FOR STATS
        $allVariants = $baseQuery->get();
        $totalVariants = $allVariants->count();

        // ✅ CALCULATE STATS ON FILTERED DATA
        $isMissing = fn($v) => empty(trim($v->barcode ?? '')) || trim($v->barcode) === '-';
        $missingVariants = $allVariants->filter($isMissing);
        $missingCount = $missingVariants->count();

        // Find duplicates (only count variants with actual barcodes)
        $barcodeCounts = $allVariants
            ->filter(fn($v) => !$isMissing($v))
            ->pluck('barcode')
            ->map('trim')
            ->countBy();

        $dupBarcodeList = $barcodeCounts
            ->filter(fn($count) => $count > 1)
            ->keys()
            ->toArray();

        $duplicateVariants = $allVariants->filter(fn($v) => !$isMissing($v) && in_array(trim($v->barcode), $dupBarcodeList, true));
        $duplicateCount = $duplicateVariants->count();

        // ✅ BUILD PREVIEW WITH NEW BARCODES
        $format  = $request->input('format', 'UPC');
        $counter = (int)($request->input('start_number', 1));
        $preview = [];

        foreach ($allVariants as $variant) {
            $rawBarcode   = $variant->barcode;
            $cleanBarcode = (!empty(trim($rawBarcode)) && trim($rawBarcode) !== '-') ? trim($rawBarcode) : null;
            $newBarcode = $this->generateBarcode($variant, $request->all(), $counter);

            $preview[] = [
                'id'                    => $variant->id,
                'product_id'            => $variant->product_id,
                'shopify_variant_id'    => $variant->shopify_variant_id,
                'title'                 => $variant->product->title ?? 'Unknown Product',
                'variant_title'         => $variant->title ?? 'Default Variant',
                'vendor'                => $variant->product->vendor ?? '',
                'sku'                   => $variant->sku ?? '',
                'image_url'             => $variant->image ?? ($variant->product->images[0]['src'] ?? null),
                'old_barcode'           => $cleanBarcode,
                'new_barcode'           => $newBarcode,
                'format'                => $format,
                'option1'               => $variant->option1,
                'option2'               => $variant->option2,
                'option3'               => $variant->option3,
                'price'                 => $variant->price,
                'inventory_quantity'    => $variant->inventory_quantity,
                'created_at'            => $variant->created_at,
                'updated_at'            => $variant->updated_at,
            ];

            $counter++;
        }

        // ✅ FILTER BY TAB - ON PREVIEW DATA
        $filtered = $preview;
        if ($tab === 'missing') {
            $filtered = array_filter($filtered, fn($i) => $i['old_barcode'] === null);
        } elseif ($tab === 'duplicates') {
            $duplicateVariantIds = $duplicateVariants->pluck('id')->toArray();
            $filtered = array_filter($filtered, fn($i) => in_array($i['id'], $duplicateVariantIds, true));
        }

        // ✅ APPLY SEARCH FILTER - DYNAMIC ON ALL FIELDS
        if ($request->filled('search')) {
            $q = strtolower(trim($request->search));
            $filtered = array_filter(
                $filtered,
                fn($i) =>
                str_contains(strtolower((string)$i['id']), $q) ||
                    str_contains(strtolower((string)$i['product_id']), $q) ||
                    str_contains(strtolower((string)$i['shopify_variant_id']), $q) ||
                    str_contains(strtolower($i['variant_title'] ?? ''), $q) ||
                    str_contains(strtolower($i['title'] ?? ''), $q) ||
                    str_contains(strtolower($i['vendor'] ?? ''), $q) ||
                    str_contains(strtolower($i['sku'] ?? ''), $q) ||
                    str_contains(strtolower($i['old_barcode'] ?? ''), $q) ||
                    str_contains(strtolower($i['new_barcode'] ?? ''), $q)
            );
        }

        $tableTotal    = count($filtered);
        $paginatedData = array_slice($filtered, ($page - 1) * $perPage, $perPage);

        // ✅ BUILD DUPLICATE GROUPS FOR DUPLICATES TAB
        $duplicateGroups = [];
        if ($tab === 'duplicates') {
            $grouped = collect($preview)
                ->filter(fn($v) => !empty(trim($v['old_barcode'] ?? '')))
                ->groupBy('old_barcode')
                ->filter(fn($group) => $group->count() > 1);

            foreach ($grouped as $barcode => $items) {
                if ($items->count() > 1) {
                    $duplicateGroups[$barcode] = $items->values()->all();
                }
            }
        }

        return response()->json([
            'data'            => array_values($paginatedData),
            'total'           => $tableTotal,
            'duplicateGroups' => $duplicateGroups,
            'stats'           => [
                'missing'     => $missingCount,
                'duplicates'  => $duplicateCount,
                'total'       => $totalVariants,
            ],
            'overall_total'   => $totalVariants,
        ]);
    }

    public function importPage()
    {
        return inertia('BarcodeImport');
    }

    public function importPreview(Request $request)
    {
        $shop = Auth::user();
        $shopifyVariantIds = array_map('strval', $request->input('variant_ids', []));

        if (empty($shopifyVariantIds)) {
            return response()->json(['variants' => []]);
        }

        $variants = Variant::with(['product'])
            ->whereIn('shopify_variant_id', $shopifyVariantIds)
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->get()
            ->map(fn($v) => [
                'id' => $v->id,
                'shopify_variant_id' => $v->shopify_variant_id,
                'product_title' => $v->product->title ?? 'Unknown',
                'variant_title' => $v->title ?? 'Default',
                'sku' => $v->sku,
                'old_barcode' => !empty(trim($v->barcode)) && trim($v->barcode) !== '-' ? trim($v->barcode) : null,
                'image_url' => $v->image ?? ($v->product->images[0]['src'] ?? null) ?? '',
            ]);

        return response()->json(['variants' => $variants]);
    }

    public function import(Request $request)
    {
        $shop = Auth::user();

        $validated = $request->validate([
            'barcodes' => 'required|array|min:1',
            'barcodes.*.shopify_variant_id' => 'required',
            'barcodes.*.barcode' => 'required|string|min:8|max:255',
        ]);

        $imported = 0;
        $failed = 0;
        $errors = [];

        DB::beginTransaction();

        foreach ($validated['barcodes'] as $index => $item) {
            $shopifyId = strval($item['shopify_variant_id']);
            $newBarcode = trim($item['barcode']);

            $variant = Variant::where('shopify_variant_id', $shopifyId)
                ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
                ->first();

            if (!$variant) {
                $errors[] = "Row " . ($index + 2) . ": Variant not found (Shopify ID: $shopifyId)";
                $failed++;
                continue;
            }

            $variant->update(['barcode' => $newBarcode]);
            $imported++;
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => "Successfully updated $imported variant(s)",
            'imported' => $imported,
            'failed' => $failed,
            'errors' => $errors,
        ]);
    }

    public function importApply(Request $request)
    {
        $shop = Auth::user();

        $validated = $request->validate([
            'custom_barcodes' => 'required|array|min:1',
            'custom_barcodes.*.shopify_variant_id' => 'required',
            'custom_barcodes.*.barcode' => 'required|string|min:8|max:255',
        ]);

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'barcode_import',
            'title' => 'Barcode CSV Import',
            'description' => 'Importing ' . count($validated['custom_barcodes']) . ' barcodes from CSV...',
            'payload' => $validated,
            'status' => 'pending',
            'total_items' => count($validated['custom_barcodes']),
        ]);

        $jobLog->markAsStarted();

        ImportBarcodesJob::dispatch(
            $shop->id,
            $validated['custom_barcodes'],
            $jobLog->id
        );

        return redirect()->route('jobs.show', $jobLog->id)
            ->with('success', 'Barcode import started! Syncing with Shopify...');
    }
}
