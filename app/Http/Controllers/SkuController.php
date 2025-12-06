<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Jobs\GenerateSkuJob;
use App\Models\JobLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Arr;
use Inertia\Inertia;

class SkuController extends Controller
{
    public function index()
    {
        $shop = Auth::user();
        $shopify = new \App\Services\ShopifyService($shop);
        $collections = $shopify->getCollections() ?? [];

        return Inertia::render('SkuGenerator', [
            'initialCollections' => $collections,
        ]);
    }

    public function apply(Request $request)
    {
        $shop = Auth::user();

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'sku_generation',
            'title' => 'SKU Generation Job',
            'description' => 'Generating SKUs for selected variants...',
            'payload' => $request->all(),
            'status' => 'pending',
        ]);

        GenerateSkuJob::dispatch($shop->id, $request->all(), $jobLog->id);

        return redirect()->route('jobs.show', $jobLog)
            ->with('success', 'SKU generation started! Redirecting to progress page...');
    }

    public function preview(Request $request)
    {
        $shop    = Auth::user();
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = 8;
        $tab     = $request->input('tab', 'all');

        // ✅ BUILD BASE QUERY WITH ALL FILTERS
        $baseQuery = $this->buildFilteredQuery($request, $shop);

        // ✅ GET ALL FILTERED VARIANTS FOR STATS
        $allVariants = $baseQuery->get();
        $totalVariants = $allVariants->count();

        // ✅ CALCULATE STATS ON FILTERED DATA
        $missingVariants = $allVariants->filter(fn($v) => is_null($v->sku) || $v->sku === '');
        $missingCount = $missingVariants->count();

        // Find duplicates (only count variants with actual SKUs)
        $skuCounts = $allVariants->filter(fn($v) => !is_null($v->sku) && $v->sku !== '')
            ->pluck('sku')
            ->countBy();
        $dupSkuList = $skuCounts->filter(fn($c) => $c > 1)->keys()->toArray();
        $duplicateVariants = $allVariants->filter(fn($v) => !is_null($v->sku) && $v->sku !== '' && in_array($v->sku, $dupSkuList, true));
        $duplicateCount = $duplicateVariants->count();

        // ✅ COUNTERS FOR DIFFERENT MODES
        $startNumber = (int)($request->input('auto_start', 1));
        $padLength   = strlen((string)$request->input('auto_start', '0001'));
        $globalCounter = $startNumber;
        $duplicateCounter = $startNumber;
        $missingCounter = $startNumber;
        $perProductCounters = [];

        $preview = [];
        $fullDuplicateGroups = collect();

        // Build duplicate groups (for duplicates tab)
        if (!empty($dupSkuList)) {
            $grouped = $allVariants->filter(fn($v) => !is_null($v->sku) && $v->sku !== '' && in_array($v->sku, $dupSkuList, true))
                ->groupBy('sku');

            $fullDuplicateGroups = $grouped->map(function ($items, $sku) use (&$duplicateCounter, $padLength, $request) {
                $variants = [];
                foreach ($items as $variant) {
                    $num = str_pad($duplicateCounter++, $padLength, '0', STR_PAD_LEFT);
                    $source = $this->getSource($variant, $request);
                    $newSku = $this->buildSku($request, $source, $num);
                    $variants[] = $this->formatVariant($variant, $newSku, true);
                }
                return ['sku' => $sku, 'count' => $items->count(), 'variants' => $variants];
            })->sortByDesc('count')->values();
        }

        // Build preview based on tab
        foreach ($allVariants as $variant) {
            $oldSku = $variant->sku;
            $isDuplicate = !is_null($oldSku) && $oldSku !== '' && in_array($oldSku, $dupSkuList, true);
            $isMissing = is_null($oldSku) || $oldSku === '';

            // Filter by tab
            if ($tab === 'duplicates' && !$isDuplicate) continue;
            if ($tab === 'missing' && !$isMissing) continue;

            // Calculate counter based on category
            if ($isMissing) {
                $number = $request->boolean('restart_per_product')
                    ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                    : $missingCounter++;
            } elseif ($isDuplicate) {
                $number = $request->boolean('restart_per_product')
                    ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                    : $duplicateCounter++;
            } else {
                $number = $request->boolean('restart_per_product')
                    ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                    : $globalCounter++;
            }

            $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);
            $source = $this->getSource($variant, $request);
            $newSku = $this->buildSku($request, $source, $num);

            $preview[] = $this->formatVariant($variant, $newSku, $isDuplicate);
        }

        // For duplicates tab, use the grouped data
        if ($tab === 'duplicates') {
            $preview = $fullDuplicateGroups->pluck('variants')->flatten(1)->all();
        }

        // Search filter (applies to preview)
        if ($request->filled('search') && !empty($preview)) {
            $q = strtolower(trim($request->search));
            $preview = array_values(array_filter($preview, function ($item) use ($q) {
                return str_contains(strtolower($item['title'] ?? ''), $q) ||
                    str_contains(strtolower($item['vendor'] ?? ''), $q) ||
                    str_contains(strtolower($item['old_sku'] ?? ''), $q) ||
                    str_contains(strtolower($item['new_sku'] ?? ''), $q);
            }));
        }

        $total = count($preview);
        $paginated = array_slice($preview, ($page - 1) * $perPage, $perPage);
        $visibleIds = Arr::pluck($paginated, 'id');

        if ($request->boolean('get_all_ids')) {
            // Return ALL variant IDs based on current filters (for "Apply to All")
            return response()->json([
                'all_variant_ids' => $allVariants->pluck('id')->toArray(),
            ]);
        }

        return response()->json([
            'preview'         => $paginated,
            'total'           => $total,
            'duplicateGroups' => $tab === 'duplicates' ? $fullDuplicateGroups->toArray() : [],
            'visibleIds'      => $visibleIds,
            'stats'           => [
                'missing'     => $missingCount,
                'duplicates'  => $duplicateCount,
                'total'       => $totalVariants,
            ],
        ]);
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

    private function getSource($variant, $request)
    {
        if ($request->input('source_field', 'none') === 'none') return '';

        $text = $request->input('source_field') === 'title'
            ? ($variant->product->title ?? '')
            : ($variant->product->vendor ?? '');

        $text = preg_replace('/[^A-Za-z0-9]/', '', $text);
        $len = max(1, (int)$request->input('source_len', 2));

        return strtoupper(
            $request->input('source_pos') === 'last'
                ? substr($text, -$len)
                : substr($text, 0, $len)
        );
    }

    private function buildSku($request, $source, $num)
    {
        $parts = [];

        if ($request->filled('prefix')) $parts[] = strtoupper($request->prefix);
        if ($source && $request->input('source_placement') === 'before') $parts[] = $source;
        $parts[] = $num;
        if ($source && $request->input('source_placement') === 'after') $parts[] = $source;
        if ($request->filled('suffix')) $parts[] = strtoupper($request->suffix);

        $sku = implode($request->input('delimiter', '-'), array_filter($parts));

        if ($request->boolean('remove_spaces')) $sku = str_replace(' ', '', $sku);
        if ($request->boolean('alphanumeric')) $sku = preg_replace('/[^A-Za-z0-9]/', '', $sku);

        return $sku;
    }

    private function formatVariant($variant, $newSku, $isDuplicate)
    {
        return [
            'id'                    => $variant->id,
            'title'                 => $variant->product->title ?? 'Untitled Product',
            'vendor'                => $variant->product->vendor ?? '',
            'option1'               => $variant->option1,
            'option2'               => $variant->option2,
            'option3'               => $variant->option3,
            'price'                 => $variant->price,
            'inventory_quantity'    => $variant->inventory_quantity,
            'barcode'               => $variant->barcode,
            'shopify_variant_id'    => $variant->shopify_variant_id,
            'image'                 => $variant->image_src ?? $variant->image ?? null,
            'old_sku'               => $variant->sku,
            'new_sku'               => $newSku,
            'is_duplicate'          => $isDuplicate,
            'created_at'            => $variant->created_at,
            'updated_at'            => $variant->updated_at,
        ];
    }
}
