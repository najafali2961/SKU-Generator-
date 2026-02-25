<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Models\Collection;
use App\Jobs\GenerateSkuJob;
use App\Models\JobLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SkuController extends Controller
{
    public function index()
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        // ✅ GET COLLECTIONS FROM DATABASE (NOT SHOPIFY API)
        $collections = Collection::where('user_id', $shop->id)
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn($c) => ['id' => $c->id, 'title' => $c->title])
            ->toArray();

        return Inertia::render('SkuGenerator', [
            'initialCollections' => $collections,
        ]);
    }

    public function apply(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        $title = 'SKU Generation';
        if ($request->input('apply_scope') === 'all') {
             switch ($request->input('active_tab')) {
                case 'duplicates':
                    $title = 'Fix Duplicate SKUs';
                    break;
                case 'missing':
                    $title = 'Generate Missing SKUs';
                    break;
                default:
                    $title = 'Generate SKUs (All)';
                    break;
            }
        }

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'sku_generation',
            'title' => $title,
            'description' => 'Generating SKUs for selected variants...',
            'payload' => $request->all(),
            'status' => 'pending',
        ]);

        // Validate credits
        $itemCount = count($request->input('selected_variant_ids', []));
        if ($request->input('apply_scope') !== 'selected') {
           // For 'all' or 'visible', we need to count. 
           // Since we trust Job to handle large batches, we validate against a 'base' count here if possible,
           // OR we just validate if they have ANY credits.
           // Better: Re-run the count query efficiently.
           $baseQuery = $this->buildFilteredQuery($request, $shop);
           $itemCount = $baseQuery->count();
        }

        $validation = $shop->validateCreditsForOperation('sku_generation', $itemCount);
        if (!$validation['can_proceed']) {
            return back()->withErrors([
                'credits' => $validation['message']
            ])->with('error', 'Insufficient credits.');
        }

        // Deduct credits
        $creditDeducted = $shop->useCredits(
            'sku_generation', 
            $itemCount, 
            "SKU generation for {$itemCount} variant(s)",
            ['apply_scope' => $request->input('apply_scope', 'selected')]
        );

        if (!$creditDeducted) {
             return back()->withErrors([
                'credits' => 'Failed to deduct credits. Please try again.'
            ])->with('error', 'Credit deduction failed.');
        }

        GenerateSkuJob::dispatch($shop->id, array_merge($request->all(), ['active_tab' => $request->input('active_tab', 'all')]), $jobLog->id);

        return redirect()->route('jobs.show', $jobLog->id)
            ->with('success', 'SKU generation started! Redirecting to progress page...');
    }

    public function export(Request $request)
    {
        Log::info('SKU Export POST initialized.', ['request' => $request->all()]);
        $id = \Illuminate\Support\Str::uuid()->toString();
        Cache::put("sku_export_{$id}", $request->all(), now()->addMinutes(5));

        Log::info("SKU Export hashed and cached. ID: {$id}");

        Log::info("SKU Export hashed and cached. ID: {$id}");

        return response()->json([
            'download_url' => route('sku-generator.download-export', ['id' => $id])
        ]);
    }

    public function downloadExport(Request $request)
    {
        Log::info('SKU Export Download (GET) started.', ['id' => $request->input('id')]);
        $id = $request->input('id');
        $filters = Cache::get("sku_export_{$id}");

        if (!$filters) {
            Log::error('SKU Export link expired or not found.', ['id' => $id]);
            return redirect()->route('sku-generator')->with('error', 'Export link expired.');
        }

        Log::info('SKU Export filters retrieved.', ['filters' => $filters]);

        // Rehydrate request with filters
        $request->merge($filters);

        /** @var \App\Models\User $shop */
        $shop = Auth::user();
        $baseQuery = $this->buildFilteredQuery($request, $shop);
        $tab = $request->input('tab', 'all');
        $fileName = 'skus-export-' . date('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($baseQuery, $tab, $request) {
            $handle = fopen('php://output', 'w');
            
            // Add BOM for Excel compatibility
            fwrite($handle, "\xEF\xBB\xBF");
            
            fputcsv($handle, [
                'Variant ID', 
                'Product Title', 
                'Variant Title', 
                'Current SKU', 
                'New SKU', 
                'Vendor', 
                'Product Type', 
                'Collections'
            ]);

            $startNumber = (int)($request->input('auto_start', 1));
            $padLength = strlen((string)$request->input('auto_start', '0001'));
            $globalCounter = $startNumber;
            $perProductCounters = [];

            $query = $baseQuery->clone();

            if ($tab === 'duplicates') {
                $dupeSkusQuery = $baseQuery->clone()
                    ->select('sku')
                    ->whereNotNull('sku')
                    ->where('sku', '<>', '')
                    ->groupBy('sku')
                    ->havingRaw('count(*) > 1');
                
                $query->whereIn('sku', $dupeSkusQuery)->orderBy('sku');
            } elseif ($tab === 'missing') {
                $query->where(function($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                });
            }

            // Relationship for collections needed? We already join in buildFilteredQuery if filtering?
            // buildFilteredQuery uses `whereHas`. It doesn't `with` collections.
            // We should eager load collections for the export CSV column.
            $query->with(['product', 'product.collections']);

            $query->chunk(1000, function ($variants) use ($handle, $request, &$globalCounter, $padLength, &$perProductCounters) {
                foreach ($variants as $variant) {
                    // Logic to calculate New SKU
                    $number = $request->boolean('restart_per_product')
                        ? ($perProductCounters[$variant->product_id] ??= (int)$request->input('auto_start', 1))
                        : $globalCounter++;
                    
                    // Increment per-product counter if used
                    if ($request->boolean('restart_per_product')) {
                         $perProductCounters[$variant->product_id]++;
                    }

                    $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);
                    $source = $this->getSource($variant, $request);
                    $newSku = $this->buildSku($request, $source, $num);

                    fputcsv($handle, [
                        '="' . $variant->shopify_variant_id . '"',
                        $variant->product->title ?? '',
                        $variant->title ?? '',
                        $variant->sku,
                        $newSku,
                        $variant->product->vendor ?? '',
                        $variant->product->product_type ?? '',
                        $variant->product->collections->pluck('title')->join(', ')
                    ]);
                }
            });

            fclose($handle);
        }, $fileName);
    }

    public function preview(Request $request)
    {
        $shop    = Auth::user();
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = 8;
        $tab     = $request->input('tab', 'all');

        $creditValidation = $shop->validateCreditsForOperation('sku_generation', 0);

        // 1. Base Query
        $baseQuery = $this->buildFilteredQuery($request, $shop);

        // 2. Stats (DB Level)
        $totalVariants = $baseQuery->count();

        // Missing Count
        $missingQuery = clone $baseQuery;
        $missingCount = $missingQuery->where(function($q) {
             $q->whereNull('sku')->orWhere('sku', '');
        })->count();

        // Duplicate Count (Variants involved in a collision)
        // Similar strategy as BarcodeController - getting count of variants with >1 occurrence
        $dupeCounts = $baseQuery->clone()
            ->select('sku', DB::raw('count(*) as total'))
            ->whereNotNull('sku')
            ->where('sku', '<>', '')
            ->groupBy('sku')
            ->having('total', '>', 1)
            ->pluck('total');
        
        $duplicateCount = $dupeCounts->sum();


        // 3. Counters Setup
        $startNumber = (int)($request->input('auto_start', 1));
        $padLength   = strlen((string)$request->input('auto_start', '0001'));

        // Fetch ACTUAL next SKU number from DB for preview accuracy
        $currentCounterRow = DB::table('sku_counters')
            ->where('shop_id', $shop->id)
            ->whereNull('product_id')
            ->first();
        
        $nextSkuNumber = $currentCounterRow ? ($currentCounterRow->counter + 1) : 1;

        // If user hasn't manually changed the start number (we detect this via frontend flag or just by comparing),
        // we might want to use the DB counter.
        // For preview: If the request 'auto_start' is exactly '1' (default) AND we have a DB counter,
        // we should probably preview using the DB counter to show what WILL happen.
        // However, the frontend will overwrite 'auto_start' with 'nextSkuNumber' on load, so 'auto_start' 
        // in the request should already be correct if we do this right. 
        // So we trust 'auto_start' from request for the preview calculation.
        
        // Calculate offset for current page global counter
        $globalCounterOffset = $startNumber + (($page - 1) * $perPage);
        
        $globalCounter = $globalCounterOffset;
        $duplicateCounter = $globalCounterOffset; 
        $missingCounter = $globalCounterOffset;
        $perProductCounters = [];


        // 4. Fetch Data
        $preview = [];
        $fullDuplicateGroups = collect(); 
        $visibleIds = [];
        $total = 0; 

        if ($tab === 'duplicates') {
             // Duplicates Logic
             $dupeSkusQuery = $baseQuery->clone()
                ->select('sku')
                ->whereNotNull('sku')
                ->where('sku', '<>', '')
                ->groupBy('sku')
                ->havingRaw('count(*) > 1');

             // Total Groups for pagination
             $totalGroups = DB::table( DB::raw("({$dupeSkusQuery->toSql()}) as sub") )
                ->mergeBindings($dupeSkusQuery->getQuery())
                ->count();
            
             $total = $totalGroups; // Frontend expects total groups count for pagination in duplicates mode

             $pagedSkus = $dupeSkusQuery
                ->orderBy('sku') // Consistent ordering
                 ->skip(($page - 1) * $perPage)
                 ->take($perPage)
                 ->pluck('sku');

             if ($pagedSkus->isNotEmpty()) {
                 $variants = $baseQuery->clone()
                    ->whereIn('sku', $pagedSkus)
                    ->orderBy('sku')
                    ->get();
                 
                 // Reuse logic to group and format
                 $grouped = $variants->groupBy('sku');
                 
                 $fullDuplicateGroups = $grouped->map(function ($items, $sku) use (&$duplicateCounter, $padLength, $request, &$perProductCounters, $startNumber) {
                     $groupVariants = [];
                     foreach ($items as $variant) {
                         $number = $request->boolean('restart_per_product')
                                ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                                : $duplicateCounter++;
                         
                         if ($request->boolean('restart_per_product')) {
                             $perProductCounters[$variant->product_id]++;
                         }

                         $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);
                         $source = $this->getSource($variant, $request);
                         $newSku = $this->buildSku($request, $source, $num);
                         $groupVariants[] = $this->formatVariant($variant, $newSku, true);
                     }
                     return ['sku' => $sku, 'count' => $items->count(), 'variants' => $groupVariants];
                 })->values(); // Removing sortByDesc to keep page consistency with query order
             }
             
             // For Frontend compatibility (it might expect flattened list in 'preview' OR use 'duplicateGroups')
             // SkuPreviewTable.jsx uses: `activeTab === "duplicates" ? ... paginatedGroups.map(...)`
             // where paginatedGroups comes from `duplicateGroups` prop.
             // So we just need to populate `duplicateGroups`.
             // And `preview` can be empty or ignored?
             // Actually currently `SkuPreviewTable` uses `preview` for "Select Visible" IDs.
             // But let's check `if ($tab === 'duplicates')` block in frontend.
             // It uses `duplicateGroups` prop.

        } elseif ($tab === 'missing') {
             $q = $baseQuery->clone()->where(function($qq) {
                 $qq->whereNull('sku')->orWhere('sku', '');
             });
             $total = $q->count();
             $variants = $q->skip(($page - 1) * $perPage)->take($perPage)->get();
             
             if ($request->boolean('restart_per_product') && $variants->isNotEmpty()) {
                 $productIds = $variants->pluck('product_id')->unique()->toArray();
                 $firstVariantIdOnPage = $variants->first()->id;

                 $priorCounts = $baseQuery->clone()->where(function($qq) {
                     $qq->whereNull('sku')->orWhere('sku', '');
                 });
                 $counts = $priorCounts->whereIn('product_id', $productIds)
                     ->where('variants.id', '<', $firstVariantIdOnPage)
                     ->selectRaw('product_id, count(*) as cnt')
                     ->groupBy('product_id')
                     ->pluck('cnt', 'product_id');

                 foreach ($productIds as $pId) {
                     $perProductCounters[$pId] = $startNumber + ($counts->get($pId, 0));
                 }
             }

             foreach ($variants as $variant) {
                 // Counter logic for preview
                 $number = $request->boolean('restart_per_product')
                        ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                        : $missingCounter++;
                 
                 if ($request->boolean('restart_per_product')) {
                     $perProductCounters[$variant->product_id]++;
                 }
                 
                 $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);
                 $source = $this->getSource($variant, $request);
                 $newSku = $this->buildSku($request, $source, $num);
                 $preview[] = $this->formatVariant($variant, $newSku, false);
             }

        } else {
             // All Variants
             $total = $totalVariants;
             $variants = $baseQuery->clone()
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();

             // Pre-calculate per-product offsets if restart_per_product is true
             if ($request->boolean('restart_per_product') && $variants->isNotEmpty()) {
                 $productIds = $variants->pluck('product_id')->unique()->toArray();
                 $firstVariantIdOnPage = $variants->first()->id;

                 // Count how many variants for each product appear in the query BEFORE the first item on this page
                 // This gives us the starting offset for this page's counters
                 $priorCounts = clone $baseQuery;
                 $counts = $priorCounts->whereIn('product_id', $productIds)
                     ->where('variants.id', '<', $firstVariantIdOnPage)
                     ->selectRaw('product_id, count(*) as cnt')
                     ->groupBy('product_id')
                     ->pluck('cnt', 'product_id');

                 foreach ($productIds as $pId) {
                     $perProductCounters[$pId] = $startNumber + ($counts->get($pId, 0));
                 }
             }

             foreach ($variants as $variant) {
                // Check if duplicate for flagging?
                $oldSku = $variant->sku;
                // Optimization: Avoid checking global duplicate list for every item if possible.
                // Or just do a quick check if this specific SKU has >1 count?
                // For preview speed, maybe skip "is_duplicate" flag exactness or do a query for these 8 items?
                // Let's grab the SKUs of these 8 items and check counts.
                // Helper:
                $currentSkus = $variants->pluck('sku')->filter()->toArray();
                $localDupeCheck = [];
                if (!empty($currentSkus)) {
                    // Check if they exist > 1 in DB
                     $localDupeCheck = Variant::whereIn('sku', $currentSkus)
                        ->select('sku')
                        ->groupBy('sku')
                        ->havingRaw('count(*) > 1')
                        ->pluck('sku')
                        ->toArray();
                }

                $isDuplicate = !empty($oldSku) && in_array($oldSku, $localDupeCheck);

                $number = $request->boolean('restart_per_product')
                        ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                        : $globalCounter++;

                if ($request->boolean('restart_per_product')) {
                    $perProductCounters[$variant->product_id]++;
                }

                $num = str_pad($number, $padLength, '0', STR_PAD_LEFT);
                $source = $this->getSource($variant, $request);
                $newSku = $this->buildSku($request, $source, $num); # Fixed variable usage
                $preview[] = $this->formatVariant($variant, $newSku, $isDuplicate);
             }
        }
        
        // Provide visible IDs for "Select Visible"
        if ($tab === 'duplicates') {
            $visibleIds = $fullDuplicateGroups->flatMap(fn($g) => collect($g['variants'])->pluck('id'))->toArray();
        } else {
            $visibleIds = Arr::pluck($preview, 'id');
        }

        if ($request->boolean('get_all_ids')) {
            $idsQuery = $baseQuery->clone();
            
            if ($tab === 'missing') {
                $idsQuery->where(function($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                });
            } elseif ($tab === 'duplicates') {
                $dupSkus = $baseQuery->clone()
                    ->select('sku')
                    ->whereNotNull('sku')
                    ->where('sku', '<>', '')
                    ->groupBy('sku')
                    ->havingRaw('count(*) > 1');
                
                $idsQuery->whereIn('sku', $dupSkus);
            }

            return response()->json([
                'all_variant_ids' => $idsQuery->pluck('variants.id')->toArray(), 
            ]);
        }

        return response()->json([
            'preview'         => $preview,
            'total'           => $total,
            'duplicateGroups' => $fullDuplicateGroups->toArray(),
            'visibleIds'      => $visibleIds,
            'stats'           => [
                'missing'     => $missingCount,
                'duplicates'  => $duplicateCount,
                'total'       => $totalVariants,
            ],
            'credit_info' => [
                'available' => $shop->getAvailableCredits(),
                'cost_per_sku' => $shop->getCreditCost('sku_generation', 1),
                'has_unlimited' => $shop->hasUnlimitedCredits(),
                'max_allowed' => $shop->getMaxAllowedItems('sku_generation'),
                'can_process_all' => $creditValidation['can_proceed'] ?? true,
            ],
            'next_sku_number' => $nextSkuNumber,
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

        // Apply collections filter (FROM DATABASE)
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

        // Apply Search Filter
        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('sku', 'like', "%{$term}%")
                  ->orWhere('title', 'like', "%{$term}%") // Variant Title
                  ->orWhereHas('product', function ($pq) use ($term) {
                      $pq->where('title', 'like', "%{$term}%");
                  });
            });
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
            'shopify_variant_id'    => $variant->shopify_variant_id,
            'title'                 => $variant->product->title ?? 'Untitled Product',
            'vendor'                => $variant->product->vendor ?? '',
            'option1'               => $variant->option1,
            'option2'               => $variant->option2,
            'option3'               => $variant->option3,
            'price'                 => $variant->price,
            'inventory_quantity'    => $variant->inventory_quantity,
            'barcode'               => $variant->barcode,
            'image'                 => $variant->image_src ?? $variant->image ?? null,
            'old_sku'               => $variant->sku,
            'new_sku'               => $newSku,
            'is_duplicate'          => $isDuplicate,
            'created_at'            => $variant->created_at,
            'updated_at'            => $variant->updated_at,
        ];
    }
}
