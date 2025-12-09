<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Models\Collection;
use App\Jobs\GenerateBarcodeJob;
use App\Jobs\ImportBarcodesJob;
use App\Models\JobLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BarcodeController extends Controller
{
    public function index()
    {
        $shop = Auth::user();

        $collections = Collection::where('user_id', $shop->id)
            ->orderBy('title')
            ->get(['id', 'title'])
            ->map(fn($c) => ['id' => $c->id, 'title' => $c->title])
            ->toArray();

        return inertia('BarcodeGenerator', [
            'initialCollections' => $collections,
        ]);
    }

    /**
     * ✅ EXACT MATCH WITH JOB - Use same function
     */
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

                // If no custom text, use SKU or product URL
                if (empty($text)) {
                    return $variant->sku ?: "https://shop.com/products/{$variant->product->handle}";
                }

                // Replace ALL template variables (with and without spaces)
                $replacements = [
                    '{{title}}' => $variant->product->title ?? '',
                    '{{ title }}' => $variant->product->title ?? '',
                    '{{handle}}' => $variant->product->handle ?? '',
                    '{{ handle }}' => $variant->product->handle ?? '',
                    '{{id}}' => (string)$variant->id,
                    '{{ id }}' => (string)$variant->id,
                    '{{sku}}' => $variant->sku ?? '',
                    '{{ sku }}' => $variant->sku ?? '',
                    '{{product_id}}' => (string)$variant->product_id,
                    '{{ product_id }}' => (string)$variant->product_id,
                    '{{variant_id}}' => (string)$variant->id,
                    '{{ variant_id }}' => (string)$variant->id,
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

        return $query;
    }

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page = max(1, (int)$request->input('page', 1));
        $perPage = 8;
        $tab = $request->input('tab', 'all');

        // ✅ LOG INCOMING SETTINGS FOR DEBUG
        \Log::info('[BARCODE-PREVIEW] Received settings', [
            'format' => $request->input('format'),
            'allow_qr_text' => $request->input('allow_qr_text'),
            'qr_text' => $request->input('qr_text'),
            'prefix' => $request->input('prefix'),
            'start_number' => $request->input('start_number'),
        ]);

        $baseQuery = $this->buildFilteredQuery($request, $shop);
        $allVariants = $baseQuery->get();
        $totalVariants = $allVariants->count();

        $isMissing = fn($v) => empty(trim($v->barcode ?? '')) || trim($v->barcode) === '-';
        $missingVariants = $allVariants->filter($isMissing);
        $missingCount = $missingVariants->count();

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

        $format = $request->input('format', 'UPC');
        $counter = (int)($request->input('start_number', 1));
        $preview = [];

        foreach ($allVariants as $variant) {
            $rawBarcode = $variant->barcode;
            $cleanBarcode = (!empty(trim($rawBarcode)) && trim($rawBarcode) !== '-') ? trim($rawBarcode) : null;

            // ✅ USE request->all() TO PASS ALL SETTINGS
            $newBarcode = $this->generateBarcode($variant, $request->all(), $counter);

            $preview[] = [
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

            $counter++;
        }

        // ✅ LOG FIRST GENERATED BARCODE FOR DEBUG
        if (count($preview) > 0) {
            \Log::info('[BARCODE-PREVIEW] First generated barcode', [
                'variant_id' => $preview[0]['id'],
                'new_barcode' => $preview[0]['new_barcode'],
                'format' => $preview[0]['format'],
            ]);
        }

        $filtered = $preview;
        if ($tab === 'missing') {
            $filtered = array_filter($filtered, fn($i) => $i['old_barcode'] === null);
        } elseif ($tab === 'duplicates') {
            $duplicateVariantIds = $duplicateVariants->pluck('id')->toArray();
            $filtered = array_filter($filtered, fn($i) => in_array($i['id'], $duplicateVariantIds, true));
        }

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

        $tableTotal = count($filtered);
        $paginatedData = array_slice($filtered, ($page - 1) * $perPage, $perPage);

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
            'data' => array_values($paginatedData),
            'total' => $tableTotal,
            'duplicateGroups' => $duplicateGroups,
            'stats' => [
                'missing' => $missingCount,
                'duplicates' => $duplicateCount,
                'total' => $totalVariants,
            ],
            'overall_total' => $totalVariants,
        ]);
    }

    public function apply(Request $request)
    {
        $shop = Auth::user();

        // ✅ LOG INCOMING APPLY SETTINGS
        \Log::info('[BARCODE-APPLY] Received settings', [
            'format' => $request->input('format'),
            'allow_qr_text' => $request->input('allow_qr_text'),
            'qr_text' => $request->input('qr_text'),
            'prefix' => $request->input('prefix'),
            'start_number' => $request->input('start_number'),
            'apply_scope' => $request->input('apply_scope'),
        ]);

        $jobLog = JobLog::create([
            'user_id' => $shop->id,
            'type' => 'barcode_generation',
            'title' => 'Barcode Generation',
            'description' => 'Generating barcodes for ' . ($request->apply_scope === 'selected' ? 'selected' : 'all') . ' variants...',
            'payload' => $request->all(), // ✅ STORE ALL SETTINGS
            'status' => 'pending',
        ]);
        $jobLog->markAsStarted();

        // ✅ PASS ALL SETTINGS TO JOB
        GenerateBarcodeJob::dispatch($shop->id, $request->all(), $jobLog->id);

        return redirect()->route('jobs.show', $jobLog->id)
            ->with('success', 'Barcode generation started!');
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
            ->with('success', 'Barcode import started!');
    }
}
