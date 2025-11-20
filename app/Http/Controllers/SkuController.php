<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Jobs\GenerateSkuJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use App\Services\ShopifyService;

class SkuController extends Controller
{
    public function index()
    {
        $shop = Auth::user();
        $shopify = new ShopifyService($shop);

        // Fetch collections from Shopify
        $collections = $shopify->getCollections(); // method we will create

        $variants = Variant::with('product')
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->take(20)
            ->get();

        return Inertia::render('SkuGenerator', [
            'initialVariants' => $variants,
            'initialCollections' => $collections,
        ]);
    }

    public function apply(Request $request)
    {
        $shop = Auth::user();
        GenerateSkuJob::dispatch($shop->id, $request->all());
        return back()->with('success', 'SKU generation started.');
    }

    public function progress()
    {
        $shop = Auth::user();
        $progress = Cache::get("sku_progress_{$shop->id}", 0);
        return response()->json(['progress' => $progress]);
    }




    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page     = max(1, (int)$request->input('page', 1));
        $perPage  = 25;
        $tab      = $request->input('tab', 'all'); // 'all' or 'duplicates'

        // Base query
        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters
        if ($request->boolean('only_missing')) {
            $query->whereNull('sku');
        }

        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', '%' . trim($request->vendor) . '%'));
        }

        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', '%' . trim($request->type) . '%'));
        }

        if ($request->filled('collections') && is_array($request->collections) && count($request->collections)) {
            $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $request->collections));
        }

        // Get ALL matching variants first (needed for accurate duplicate detection + total)
        $allVariants = $query->get();

        // Duplicate detection (across ALL matching variants)
        $duplicateSkus = $allVariants
            ->whereNotNull('sku')
            ->countBy('sku')
            ->filter(fn($count) => $count > 1)
            ->keys()
            ->all();

        // Source settings
        $sourceField     = $request->input('source_field', 'none');     // none | title | vendor
        $sourcePos       = $request->input('source_pos', 'first');      // first | last
        $sourceLen       = max(1, (int)$request->input('source_len', 2));
        $sourcePlacement = $request->input('source_placement', 'before'); // before | after

        $counter   = (int)($request->input('auto_start', 1));
        $padLength = strlen($request->input('auto_start', '0001'));

        $preview = [];

        foreach ($allVariants as $variant) {
            $product   = $variant->product;
            $oldSku    = $variant->sku;
            $isDuplicate = $oldSku && in_array($oldSku, $duplicateSkus, true);

            // Skip non-duplicates when in duplicates tab
            if ($tab === 'duplicates' && !$isDuplicate) {
                continue;
            }

            // ——— Smart Source Fragment ———
            $source = '';
            if ($sourceField !== 'none') {
                $text = $sourceField === 'title' ? ($product->title ?? '') : ($product->vendor ?? '');
                $text = preg_replace('/[^A-Za-z0-9]/', '', $text); // clean

                if ($sourcePos === 'last') {
                    $source = strtoupper(substr($text, -$sourceLen));
                } else {
                    $source = strtoupper(substr($text, 0, $sourceLen));
                }
            }

            $num = str_pad($counter, $padLength, '0', STR_PAD_LEFT);

            // Build parts
            $parts = [];

            if ($request->filled('prefix')) {
                $parts[] = strtoupper($request->prefix);
            }

            if ($source && $sourcePlacement === 'before') {
                $parts[] = $source;
            }

            $parts[] = $num;

            if ($source && $sourcePlacement === 'after') {
                $parts[] = $source;
            }

            if ($request->filled('suffix')) {
                $parts[] = strtoupper($request->suffix);
            }

            $delimiter = $request->input('delimiter', '-');
            $newSku    = implode($delimiter, $parts);

            // Cleaning rules
            if ($request->boolean('remove_spaces')) {
                $newSku = str_replace(' ', '', $newSku);
            }
            if ($request->boolean('alphanumeric')) {
                $newSku = preg_replace('/[^A-Za-z0-9]/', '', $newSku);
            }

            $preview[] = [
                'id'           => $variant->id,
                'title'        => $product->title ?? 'Untitled Product',
                'vendor'       => $product->vendor ?? '',
                'option'       => trim(($variant->option1 ?? '') . ' ' . ($variant->option2 ?? '') . ' ' . ($variant->option3 ?? '')),
                'image'        => $variant->image_src ?? $product->image_src ?? null,
                'old_sku'      => $oldSku,
                'new_sku'      => $newSku,
                'is_duplicate' => $isDuplicate,
            ];

            $counter++;
        }

        // Client-side search (safe & fast)
        if ($request->filled('search')) {
            $q = strtolower(trim($request->search));
            $preview = array_values(array_filter($preview, function ($item) use ($q) {
                return str_contains(strtolower($item['title']), $q) ||
                    str_contains(strtolower($item['vendor'] ?? ''), $q) ||
                    str_contains(strtolower($item['old_sku'] ?? ''), $q) ||
                    str_contains(strtolower($item['new_sku'] ?? ''), $q);
            }));
        }

        // Pagination
        $totalAfterFilters = count($preview);
        $paginated = array_slice($preview, ($page - 1) * $perPage, $perPage);

        return response()->json([
            'preview' => $paginated,
            'total'   => $totalAfterFilters,
        ]);
    }
}
