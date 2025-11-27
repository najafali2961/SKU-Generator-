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
        $shop    = Auth::user();
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = 25;
        $tab     = $request->input('tab', 'all');

        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters
        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', '%' . trim($request->vendor) . '%'));
        }
        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', '%' . trim($request->type) . '%'));
        }
        if ($request->filled('collections') && is_array($request->collections) && count($request->collections)) {
            $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $request->collections));
        }

        $allVariants = $query->get();

        // === STATS ===
        $missingCount = $allVariants->whereNull('sku')->count();

        $skuCounts = $allVariants
            ->whereNotNull('sku')
            ->pluck('sku')
            ->countBy();

        $dupSkuList = $skuCounts->filter(fn($c) => $c > 1)->keys()->all();
        $duplicateCount = $allVariants->whereNotNull('sku')->whereIn('sku', $dupSkuList)->count();

        // === GLOBAL COUNTERS ===
        $startNumber      = (int)($request->input('auto_start', 1));
        $padLength        = strlen((string)$request->input('auto_start', '0001'));
        $globalCounter    = $startNumber;
        $duplicateCounter = $startNumber;  // ONE counter for ALL duplicates
        $perProductCounters = [];

        // === PREVIEW + FULL DUPLICATE DATA ===
        $preview = [];
        $fullDuplicateGroups = collect();

        if ($tab === 'duplicates' && !empty($dupSkuList)) {
            $grouped = $allVariants
                ->whereNotNull('sku')
                ->whereIn('sku', $dupSkuList)
                ->groupBy('sku');

            $fullDuplicateGroups = $grouped->map(function ($items, $sku) use (&$duplicateCounter, $padLength, $request) {
                $groupVariants = [];
                foreach ($items as $variant) {
                    $num = str_pad($duplicateCounter++, $padLength, '0', STR_PAD_LEFT);

                    // Build source
                    $source = '';
                    if ($request->input('source_field', 'none') !== 'none') {
                        $text = $request->input('source_field') === 'title'
                            ? ($variant->product->title ?? '')
                            : ($variant->product->vendor ?? '');
                        $text = preg_replace('/[^A-Za-z0-9]/', '', $text);
                        $len = max(1, (int)$request->input('source_len', 2));
                        $source = strtoupper($request->input('source_pos') === 'last' ? substr($text, -$len) : substr($text, 0, $len));
                    }

                    $parts = [];
                    if ($request->filled('prefix')) $parts[] = strtoupper($request->prefix);
                    if ($source && $request->input('source_placement') === 'before') $parts[] = $source;
                    $parts[] = $num;
                    if ($source && $request->input('source_placement') === 'after') $parts[] = $source;
                    if ($request->filled('suffix')) $parts[] = strtoupper($request->suffix);

                    $newSku = implode($request->input('delimiter', '-'), array_filter($parts));
                    if ($request->boolean('remove_spaces')) $newSku = str_replace(' ', '', $newSku);
                    if ($request->boolean('alphanumeric')) $newSku = preg_replace('/[^A-Za-z0-9]/', '', $newSku);

                    $groupVariants[] = [
                        'id'       => $variant->id,
                        'title'    => $variant->product->title ?? 'Untitled',
                        'vendor'   => $variant->product->vendor ?? '',
                        'option'   => trim(implode(' ', array_filter([$variant->option1, $variant->option2, $variant->option3]))),
                        'image'    => $variant->image,
                        'old_sku'  => $variant->sku,
                        'new_sku'  => $newSku,
                    ];
                }

                return [
                    'sku'      => $sku,
                    'count'    => $items->count(),
                    'variants' => $groupVariants,
                ];
            })->sortByDesc('count')->values();
        }

        // === BUILD PREVIEW (for current page) ===
        foreach ($allVariants as $variant) {
            $oldSku      = $variant->sku;
            $isDuplicate = $oldSku && in_array($oldSku, $dupSkuList, true);
            $isMissing   = is_null($oldSku);

            if ($tab === 'duplicates' && !$isDuplicate) continue;
            if ($tab === 'missing'    && !$isMissing)   continue;

            if ($isDuplicate) {
                // Skip — already added in fullDuplicateGroups above
                continue;
            }

            // Normal flow (non-duplicates)
            if ($request->boolean('restart_per_product')) {
                $pid = $variant->product_id;
                if (!isset($perProductCounters[$pid])) $perProductCounters[$pid] = $startNumber;
                $number = $perProductCounters[$pid]++;
            } else {
                $number = $globalCounter++;
            }

            $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);

            $source = '';
            if ($request->input('source_field', 'none') !== 'none') {
                $text = $request->input('source_field') === 'title'
                    ? ($variant->product->title ?? '')
                    : ($variant->product->vendor ?? '');
                $text = preg_replace('/[^A-Za-z0-9]/', '', $text);
                $len = max(1, (int)$request->input('source_len', 2));
                $source = strtoupper($request->input('source_pos') === 'last' ? substr($text, -$len) : substr($text, 0, $len));
            }

            $parts = [];
            if ($request->filled('prefix')) $parts[] = strtoupper($request->prefix);
            if ($source && $request->input('source_placement') === 'before') $parts[] = $source;
            $parts[] = $num;
            if ($source && $request->input('source_placement') === 'after') $parts[] = $source;
            if ($request->filled('suffix')) $parts[] = strtoupper($request->suffix);

            $newSku = implode($request->input('delimiter', '-'), array_filter($parts));
            if ($request->boolean('remove_spaces')) $newSku = str_replace(' ', '', $newSku);
            if ($request->boolean('alphanumeric')) $newSku = preg_replace('/[^A-Za-z0-9]/', '', $newSku);

            $preview[] = [
                'id'           => $variant->id,
                'title'        => $variant->product->title ?? 'Untitled',
                'vendor'       => $variant->product->vendor ?? '',
                'option'       => trim(implode(' ', array_filter([$variant->option1, $variant->option2, $variant->option3]))),
                'image'        => $variant->image,
                'old_sku'      => $oldSku,
                'new_sku'      => $newSku,
                'is_duplicate' => $isDuplicate,
            ];
        }

        // For duplicates tab: use full groups as preview
        if ($tab === 'duplicates') {
            $preview = $fullDuplicateGroups->pluck('variants')->flatten(1)->all();
            $total   = $preview ? count($preview) : 0;
        }

        // Search
        if ($request->filled('search') && !empty($preview)) {
            $q = strtolower(trim($request->search));
            $preview = array_values(array_filter(
                $preview,
                fn($i) =>
                str_contains(strtolower($i['title'] ?? ''), $q) ||
                    str_contains(strtolower($i['vendor'] ?? ''), $q) ||
                    str_contains(strtolower($i['old_sku'] ?? ''), $q) ||
                    str_contains(strtolower($i['new_sku'] ?? ''), $q)
            ));
        }

        $total     = count($preview);
        $paginated = array_slice($preview, ($page - 1) * $perPage, $perPage);

        return response()->json([
            'preview'         => $paginated,
            'total'           => $total,
            'duplicateGroups' => $tab === 'duplicates' ? $fullDuplicateGroups->all() : [],
            'stats'           => [
                'missing'     => $missingCount,
                'duplicates'  => $duplicateCount,
            ],
        ]);
    }
}
