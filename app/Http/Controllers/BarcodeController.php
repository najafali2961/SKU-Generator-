<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateBarcodeJob;
use App\Jobs\ImportBarcodesJob;
use App\Models\Collection;
use App\Models\JobLog;
use App\Models\Variant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BarcodeController extends Controller
{
    public function index()
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        $collections = Collection::where('user_id', $shop->id)
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn($c) => ['id' => $c->id, 'title' => $c->title])
            ->toArray();

        $currentCounterRow = DB::table('barcode_counters')
            ->where('shop_id', $shop->id)
            ->where('format', 'UPC')
            ->first();

        $initialStartNumber = $currentCounterRow ? ($currentCounterRow->counter + 1) : 1;

        return inertia('BarcodeGenerator', [
            'initialCollections' => $collections,
            'availableCredits' => $shop->getAvailableCredits(),
            'hasUnlimitedCredits' => $shop->hasUnlimitedCredits(),
            'creditCostPerBarcode' => $shop->getCreditCost('barcode_generation', 1),
            'initialStartNumber' => $initialStartNumber,
        ]);
    }

    public function export(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();
        if (!$user->hasFeature('csv-export')) {
            return $user->featureLockedResponse('csv-export');
        }

        $id = \Illuminate\Support\Str::uuid()->toString();
        Cache::put("barcode_export_{$id}", $request->all(), now()->addMinutes(5));

        $downloadUrl = route('barcode-generator.download-export', ['id' => $id]);

        if ($request->header('X-Inertia')) {
            return Inertia::location($downloadUrl);
        }

        return response()->json([
            'download_url' => $downloadUrl,
        ]);
    }

    public function downloadExport(Request $request)
    {
        $id = $request->input('id');
        $filters = Cache::get("barcode_export_{$id}");

        if (!$filters) {
            Log::error('Barcode Export link expired or not found.', ['id' => $id]);
            return redirect()->route('barcode')->with('error', 'Export link expired.');
        }

        $request->merge($filters);

        /** @var \App\Models\User $shop */
        $shop = Auth::user();
        $baseQuery = $this->buildFilteredQuery($request, $shop);
        $tab = $request->input('tab', 'all');
        $fileName = 'barcodes-export-' . date('Y-m-d') . '.csv';

        return response()->streamDownload(function () use ($baseQuery, $tab, $request) {
            $handle = fopen('php://output', 'w');

            // Add BOM
            fwrite($handle, "\u{FEFF}");

            fputcsv($handle, [
                'Barcode',
                'Format',
                'Variant ID',
                'Product Title',
                'SKU',
                'Old Barcode',
                'New Barcode',
            ]);

            $startNumber = (int) ($request->input('start_number', 1));
            $globalCounter = $startNumber;
            $format = $request->input('format', 'UPC');
            $rules = $request->all();

            $query = $baseQuery->clone();

            if ($tab === 'duplicates') {
                $dupeBarcodesQuery = $baseQuery
                    ->clone()
                    ->select('barcode')
                    ->whereNotNull('barcode')
                    ->where('barcode', '<>', '')
                    ->where('barcode', '<>', '-')
                    ->groupBy('barcode')
                    ->havingRaw('count(*) > 1');

                $query->whereIn('barcode', $dupeBarcodesQuery)->orderBy('barcode');
            } elseif ($tab === 'missing') {
                $query->where(function ($q) {
                    $q
                        ->whereNull('barcode')
                        ->orWhere('barcode', '')
                        ->orWhere('barcode', '-');
                });
            }

            $query->chunk(1000, function ($variants) use ($handle, $rules, $format, &$globalCounter) {
                foreach ($variants as $variant) {
                    $newBarcode = $this->generateBarcode($variant, $rules, $globalCounter++);
                    $oldBarcode = $variant->barcode;
                    if (empty(trim($oldBarcode)) || trim($oldBarcode) === '-') {
                        $oldBarcode = '';
                    }

                    fputcsv($handle, [
                        $newBarcode,
                        $format,
                        '="' . $variant->shopify_variant_id . '"',
                        $variant->product->title ?? '',
                        $variant->sku ?? '',
                        $oldBarcode,
                        $newBarcode
                    ]);
                }
            });

            fclose($handle);
        }, $fileName);
    }

    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = trim($rules['prefix'] ?? '');
        $suffix = trim($rules['suffix'] ?? '');
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;
        $enforce_length = $rules['enforce_length'] ?? true;

        // QR CODE / DATA MATRIX / PDF417
        if (in_array($format, ['QR', 'DATAMATRIX', 'PDF417'])) {
            if ($rules['allow_qr_text'] ?? false) {
                $text = trim($rules['qr_text'] ?? '');

                if (empty($text)) {
                    return $variant->sku ?: "https://shop.com/products/{$variant->product->handle}";
                }

                $replacements = [
                    '{{title}}' => $variant->product->title ?? '',
                    '{{ title }}' => $variant->product->title ?? '',
                    '{{handle}}' => $variant->product->handle ?? '',
                    '{{ handle }}' => $variant->product->handle ?? '',
                    '{{id}}' => (string) $variant->id,
                    '{{ id }}' => (string) $variant->id,
                    '{{sku}}' => $variant->sku ?? '',
                    '{{ sku }}' => $variant->sku ?? '',
                    '{{product_id}}' => (string) $variant->product_id,
                    '{{ product_id }}' => (string) $variant->product_id,
                    '{{variant_id}}' => (string) $variant->id,
                    '{{ variant_id }}' => (string) $variant->id,
                ];

                return str_replace(
                    array_keys($replacements),
                    array_values($replacements),
                    $text
                );
            }
            return 'QR-' . strtoupper(Str::random(12));
        }

        // CODE128 / CODE39
        if (in_array($format, ['CODE128', 'CODE128A', 'CODE128B', 'CODE128C', 'CODE39'])) {
            $base = $prefix . ($variant->sku ?: "V{$variant->id}") . $suffix;
            return $numeric_only ? preg_replace('/\D/', '', $base) : $base;
        }

        // UPC / EAN / ISBN
        $targetLength = match ($format) {
            'UPC', 'UPCA' => 12,
            'UPCE' => 8,
            'EAN8' => 8,
            'ITF14' => 14,
            default => 13,
        };

        $base = $prefix . str_pad($counter, 6, '0', STR_PAD_LEFT) . $suffix;

        if ($numeric_only) {
            $base = preg_replace('/\D/', '', $base);
        }

        $code = substr($base, 0, $targetLength - ($checksum ? 1 : 0));

        if ($auto_fill) {
            $code = str_pad($code, $targetLength - ($checksum ? 1 : 0), '0', STR_PAD_LEFT);
        }

        if ($enforce_length && strlen($code) != ($targetLength - ($checksum ? 1 : 0))) {
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

        return (10 - ($sum % 10)) % 10;
    }

    private function buildFilteredQuery(Request $request, $shop)
    {
        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if ($request->filled('vendor')) {
            $vendor = trim($request->vendor);
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', '%' . $vendor . '%'));
        }

        if ($request->filled('type')) {
            $type = trim($request->type);
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', '%' . $type . '%'));
        }

        if ($request->filled('collections') && is_array($request->collections) && count($request->collections)) {
            $collectionIds = array_filter($request->collections);
            if (count($collectionIds) > 0) {
                $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $collectionIds));
            }
        }

        if ($request->filled('tags')) {
            $tags = $request->tags;
            if (is_string($tags)) {
                $tags = array_map(fn($t) => trim($t), explode(',', $tags));
            }
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
                $q
                    ->where('barcode', 'like', "%{$term}%")
                    ->orWhere('sku', 'like', "%{$term}%")
                    ->orWhere('title', 'like', "%{$term}%")
                    ->orWhereHas('product', function ($pq) use ($term) {
                        $pq->where('title', 'like', "%{$term}%");
                    });
            });
        }

        return $query;
    }

    public function preview(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();
        $page = max(1, (int) $request->input('page', 1));
        $perPage = 8;
        $tab = $request->input('tab', 'all');

        // 1. Base Query (Filters applied)

        $baseQuery = $this->buildFilteredQuery($request, $shop);

        if ($request->boolean('get_all_ids')) {
            $idsQuery = $baseQuery->clone();

            if ($tab === 'missing') {
                $idsQuery->where(function ($q) {
                    $q
                        ->whereNull('barcode')
                        ->orWhere('barcode', '')
                        ->orWhere('barcode', '-');
                });
            } elseif ($tab === 'duplicates') {
                $dupBarcodes = $baseQuery
                    ->clone()
                    ->select('barcode')
                    ->whereNotNull('barcode')
                    ->where('barcode', '<>', '')
                    ->where('barcode', '<>', '-')
                    ->groupBy('barcode')
                    ->havingRaw('count(*) > 1');

                $idsQuery->whereIn('barcode', $dupBarcodes);
            }

            return response()->json([
                'all_variant_ids' => $idsQuery->pluck('variants.id')->toArray(),
            ]);
        }

        // 2. Efficient Totals (DB Level)
        $totalVariants = $baseQuery->count();

        // 3. Missing Count (DB Level)
        $missingQuery = clone $baseQuery;
        $missingCount = $missingQuery->where(function ($q) {
            $q
                ->whereNull('barcode')
                ->orWhere('barcode', '')
                ->orWhere('barcode', '-');
        })->count();

        // 4. Duplicate Count (DB Level - Optimized)
        // We need the number of variants that belong to a duplicate group
        $dupeStatsQuery = clone $baseQuery;
        // Optimization: We only check duplicates within the current filtered scope?
        // Original code checked duplicates within "$allVariants" (the filtered result).
        // So yes, we scope it to the current filters.

        // Complex query to get count of variants that have duplicates
        $duplicateCount = 0;
        // Only run this expensive query if we need to display it
        // To avoid complexity, we can cache this or calculate it differently,
        // but for now let's try a direct aggregation.

        // Subquery to find barcodes with > 1 occurrence
        $dupeBarcodes = DB::table('variants')
            ->select('barcode')
            ->join('products', 'variants.product_id', '=', 'products.id')
            ->where('products.user_id', $shop->id)
            ->whereNotNull('barcode')
            ->where('barcode', '<>', '')
            ->where('barcode', '<>', '-')
            // Apply other filters from request if necessary?
            // The original logic filtered duplicates FROM the filtered set.
            // If I filter by "Vendor A", do I only care about duplicates WITHIN Vendor A?
            // Yes, original code: $duplicateVariants = $allVariants->filter(...)
            // So we must replicate filters.
            ->groupBy('barcode')
            ->havingRaw('COUNT(*) > 1');

        // Note: Re-applying all `buildFilteredQuery` filters to a raw DB query is hard because of Eloquent scopes.
        // Simplified approach for duplicates count:
        // Use the Eloquent query to get aggregated counts.
        $dupeCounts = $baseQuery
            ->clone()
            ->select('barcode', DB::raw('count(*) as total'))
            ->whereNotNull('barcode')
            ->where('barcode', '<>', '')
            ->where('barcode', '<>', '-')
            ->groupBy('barcode')
            ->having('total', '>', 1)
            ->pluck('total');  // This returns a collection of counts, e.g. [2, 3, 2]

        $duplicateCount = $dupeCounts->sum();

        // 5. Data Fetching based on Tab
        $variants = collect();
        $duplicateGroups = [];
        $tableTotal = 0;

        $format = $request->input('format', 'UPC');
        // Counter needs to be offset by page if we want continuous numbers across pages?
        // Original code: $counter = (int)($request->input('start_number', 1));
        // And it incremented for EACH variant in the WHOLE list.
        // So for page 2, start_number should be start_number + (page-1)*perPage.
        // However, this depends on if we are "applying" or just previewing.
        // For preview, it's visualization.
        // Logic: specific Page 1 shows 1..8, Page 2 shows 9..16.
        $startNumber = (int) ($request->input('start_number', 1));
        $currentCounter = $startNumber + (($page - 1) * $perPage);

        if ($tab === 'duplicates') {
            // Fetch Duplicates Logic
            // We need to paginate "Groups" or "Variants"? Original UI shows Groups.
            // But pagination was on rows (items)?
            // Original: "paginatedGroups = duplicateGroupList.slice..."
            // So pagination is by GROUP.

            // 1. Get all duplicate barcodes (paginated)
            // We reuse the $dupeCounts logic but paginated
            $dupeBarcodesQuery = $baseQuery
                ->clone()
                ->select('barcode')
                ->whereNotNull('barcode')
                ->where('barcode', '<>', '')
                ->where('barcode', '<>', '-')
                ->groupBy('barcode')
                ->havingRaw('count(*) > 1');

            // For pagination, we paginate the DISTINCT BARCODES (Groups)
            $totalGroups = DB::table(DB::raw("({$dupeBarcodesQuery->toSql()}) as sub"))
                ->mergeBindings($dupeBarcodesQuery->getQuery())
                ->count();

            $tableTotal = $totalGroups;

            $pagedBarcodes = $dupeBarcodesQuery
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->pluck('barcode');

            if ($pagedBarcodes->isNotEmpty()) {
                // Now fetch all variants for these barcodes
                $variants = $baseQuery
                    ->clone()
                    ->whereIn('barcode', $pagedBarcodes)
                    ->orderBy('barcode')  // Group visually
                    ->get();

                // Group them for the response. Assign a sequential proposed
                // number to each conflicting variant (starting from the real
                // next counter) so the preview shows the distinct unique barcode
                // each will receive — previously every row was passed counter 0
                // and rendered as "000000000000".
                $dupCounter = $currentCounter;
                foreach ($variants as $v) {
                    $duplicateGroups[$v->barcode][] = $this->transformVariant($v, $request->all(), $format, $dupCounter++);
                }
            }

            // To keep frontend happy, we pass `duplicateGroups` as object { barcode: [variants...] }
            // $variants collection is not really used for rows in "duplicates" mode by my analysis of frontend code?
            // Frontend: `paginatedGroups.map(renderDuplicateGroup)`
            // So we need to return `duplicateGroups` populated.
        } elseif ($tab === 'missing') {
            // Fetch Missing Logic
            $q = $baseQuery
                ->clone()
                ->where(function ($qq) {
                    $qq
                        ->whereNull('barcode')
                        ->orWhere('barcode', '')
                        ->orWhere('barcode', '-');
                });

            $tableTotal = $q->count();
            $variants = $q
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();
        } else {
            // Fetch All Logic
            $tableTotal = $totalVariants;
            $variants = $baseQuery
                ->clone()
                ->skip(($page - 1) * $perPage)
                ->take($perPage)
                ->get();
        }

        // Transform variants for response. For duplicates the rows were already
        // built (with sequential proposed barcodes) into $duplicateGroups above.
        $previewData = [];
        if ($tab !== 'duplicates') {
            foreach ($variants as $index => $variant) {
                $previewData[] = $this->transformVariant($variant, $request->all(), $format, $currentCounter + $index);
            }
        }

        $creditValidation = $shop->validateCreditsForOperation('barcode_generation', $totalVariants);

        // 6. Fetch ACTUAL next Barcode number from DB for preview accuracy
        $format = $request->input('format', 'UPC');
        $currentCounterRow = DB::table('barcode_counters')
            ->where('shop_id', $shop->id)
            ->where('format', $format)
            ->first();

        // If no counter exists, next is 1. If exists, next is counter + 1.
        $nextStartNumber = $currentCounterRow ? ($currentCounterRow->counter + 1) : 1;

        return response()->json([
            // ... existing data ...
            'data' => $previewData,
            'total' => $tableTotal,
            'duplicateGroups' => $duplicateGroups,
            'stats' => [
                'missing' => $missingCount,
                'duplicates' => $duplicateCount,
                'total' => $totalVariants,
            ],
            'overall_total' => $totalVariants,
            'credit_info' => [
                'available' => $shop->getAvailableCredits(),
                'cost_per_barcode' => $shop->getCreditCost('barcode_generation', 1),
                'has_unlimited' => $shop->hasUnlimitedCredits(),
                'max_allowed' => $shop->getMaxAllowedItems('barcode_generation'),
                'can_process_all' => $creditValidation['can_proceed'],
            ],
            'next_start_number' => $nextStartNumber,  // New field
        ]);
    }

    private function transformVariant($variant, $rules, $format, $counter)
    {
        $trimmed = trim((string) ($variant->barcode ?? ''));
        $cleanBarcode = ($trimmed !== '' && $trimmed !== '-') ? $trimmed : null;
        $newBarcode = $this->generateBarcode($variant, $rules, $counter);

        return [
            'id' => $variant->id,
            'product_id' => $variant->product_id,
            'shopify_variant_id' => $variant->shopify_variant_id,
            'title' => $variant->product->title ?? 'Unknown Product',
            'variant_title' => $variant->title ?? 'Default Variant',
            'vendor' => $variant->product->vendor ?? '',
            'sku' => $variant->sku ?? '',
            'image_url' => $variant->image ?? ($variant->product->images[0]['src'] ?? null),
            'old_barcode' => $cleanBarcode,
            'new_barcode' => $newBarcode,
            'format' => $format,
            'option1' => $variant->option1,
            'option2' => $variant->option2,
            'option3' => $variant->option3,
            'price' => $variant->price,
            'inventory_quantity' => $variant->inventory_quantity,
            'created_at' => $variant->created_at,
            'updated_at' => $variant->updated_at,
        ];
    }

    public function apply(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();
        $applyScope = $request->input('apply_scope', 'selected');

        if ($applyScope === 'selected') {
            $selectedIds = $request->input('selected_variant_ids', []);
            $itemCount = count($selectedIds);
        } else {
            $baseQuery = $this->buildFilteredQuery($request, $shop);
            $itemCount = $baseQuery->count();
        }

        // Validate credits BEFORE creating job
        $validation = $shop->validateCreditsForOperation('barcode_generation', $itemCount);
        if (!$validation['can_proceed']) {
            return back()->withErrors([
                'credits' => $validation['message']
            ])->with('error', 'Insufficient credits to generate barcodes.');
        }

        // ✅ DEDUCT CREDITS HERE - BEFORE JOB DISPATCH (like import does)
        $creditDeducted = $shop->useCredits(
            'barcode_generation',
            $itemCount,
            "Barcode generation for {$itemCount} variant(s)",
            [
                'apply_scope' => $applyScope,
                'format' => $request->input('format', 'UPC'),
            ]
        );

        if (!$creditDeducted) {
            return back()->withErrors([
                'credits' => 'Failed to deduct credits. Please try again.'
            ])->with('error', 'Credit deduction failed.');
        }

        $title = 'Barcode Generation';
        $itemCount = $itemCount;  // Variable available from above

        if ($applyScope === 'all') {
            switch ($request->input('active_tab')) {
                case 'duplicates':
                    $title = 'Fix Duplicate Barcodes';
                    break;
                case 'missing':
                    $title = 'Generate Missing Barcodes';
                    break;
                default:
                    $title = 'Generate Barcodes (All)';
                    break;
            }
        }

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'barcode_generation',
            'title' => $title,
            'description' => "Generating barcodes for {$itemCount} variant(s)...",
            'payload' => $request->all(),
            'status' => 'pending',
            'total_items' => $itemCount,
        ]);

        $jobLog->markAsStarted();

        // Dispatch with ONLY safe data (no closures)
        GenerateBarcodeJob::dispatch(
            $shop->id,
            [
                'format' => $request->input('format', 'UPC'),
                'prefix' => $request->input('prefix', ''),
                'suffix' => $request->input('suffix', ''),
                'checksum' => $request->boolean('checksum', true),
                'numeric_only' => $request->boolean('numeric_only', true),
                'auto_fill' => $request->boolean('auto_fill', true),
                'enforce_length' => $request->boolean('enforce_length', true),
                'allow_qr_text' => $request->boolean('allow_qr_text', false),
                'qr_text' => $request->input('qr_text', ''),
                'start_number' => (int) $request->input('start_number', 1),
                'vendor' => $request->input('vendor', ''),
                'type' => $request->input('type', ''),
                'collections' => $request->input('collections', []),
                'tags' => $request->input('tags', ''),
                'apply_scope' => $applyScope,
                'active_tab' => $request->input('active_tab', 'all'),  // Pass active tab
                'selected_variant_ids' => $applyScope === 'selected' ? $selectedIds : [],
            ],
            $jobLog->id
        );

        return redirect()
            ->route('jobs.show', $jobLog->id)
            ->with('success', "Barcode generation started! {$itemCount} credits deducted.");
    }

    public function importPage()
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        return inertia('BarcodeImport', [
            'availableCredits' => $shop->getAvailableCredits(),
            'hasUnlimitedCredits' => $shop->hasUnlimitedCredits(),
            'creditCostPerBarcode' => $shop->getCreditCost('barcode_import', 1),
        ]);
    }

    public function importPreview(Request $request)
    {
        /** @var \App\Models\User $shop */
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

    public function importApply(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        if (!$shop->hasFeature('barcode-csv-import')) {
            return $shop->featureLockedResponse('barcode-csv-import');
        }

        $validated = $request->validate([
            'custom_barcodes' => 'required|array|min:1',
            'custom_barcodes.*.shopify_variant_id' => 'required',
            'custom_barcodes.*.barcode' => 'required|string|min:8|max:255',
        ]);

        $itemCount = count($validated['custom_barcodes']);

        // Validate credits
        $validation = $shop->validateCreditsForOperation('barcode_import', $itemCount);

        if (!$validation['can_proceed']) {
            return back()->withErrors([
                'credits' => $validation['message']
            ])->with('error', 'Insufficient credits to import barcodes.');
        }

        // ✅ DEDUCT CREDITS HERE - BEFORE JOB DISPATCH
        $creditDeducted = $shop->useCredits(
            'barcode_import',
            $itemCount,
            "Barcode import for {$itemCount} variant(s)",
            [
                'source' => 'csv_import',
            ]
        );

        if (!$creditDeducted) {
            return back()->withErrors([
                'credits' => 'Failed to deduct credits. Please try again.'
            ])->with('error', 'Credit deduction failed.');
        }

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'barcode_import',
            'title' => 'Barcode CSV Import',
            'description' => "Importing {$itemCount} barcode(s) from CSV...",
            'payload' => $validated,
            'status' => 'pending',
            'total_items' => $itemCount,
        ]);

        $jobLog->markAsStarted();

        ImportBarcodesJob::dispatch(
            $shop->id,
            $validated['custom_barcodes'],
            $jobLog->id
        );

        return redirect()
            ->route('jobs.show', $jobLog->id)
            ->with('success', "Barcode import started! {$itemCount} credits deducted.");
    }
}
