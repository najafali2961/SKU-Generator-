<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Jobs\GenerateBarcodeJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

class BarcodeController extends Controller
{
    public function index()
    {
        $shop = Auth::user();

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
            ])
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
        GenerateBarcodeJob::dispatch($shop->id, $request->all());
        return back()->with('success', 'Barcode generation started in background...');
    }

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page    = max(1, (int)$request->input('page', 1));
        $perPage = 25;
        $tab     = $request->input('tab', 'all');

        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters (search, vendor, type)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhereHas('product', fn($qq) => $qq->where('title', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', $request->vendor));
        }
        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', $request->type));
        }

        $allVariants = $query->get();

        // === REAL STATS - Treat NULL, "", "-" as MISSING ===
        $isMissing = fn($v) => empty(trim($v->barcode ?? '')) || trim($v->barcode) === '-';

        $missingCount = $allVariants->filter($isMissing)->count();

        $realBarcodes = $allVariants
            ->filter(fn($v) => !$isMissing($v))
            ->pluck('barcode')
            ->map(fn($b) => trim($b));

        $duplicateGroupsCount = $realBarcodes->countBy()
            ->filter(fn($count) => $count > 1)
            ->count();

        $stats = [
            'missing'    => $missingCount,
            'duplicates' => $duplicateGroupsCount,
        ];

        // === Build preview ===
        $format  = $request->input('format', 'UPC');
        $counter = (int)($request->input('start_number', 1));
        $preview = [];

        foreach ($allVariants as $variant) {
            $rawBarcode = $variant->barcode;
            $cleanBarcode = !empty(trim($rawBarcode)) && trim($rawBarcode) !== '-' ? trim($rawBarcode) : null;

            $newBarcode = $this->generateBarcode($variant, $request->all(), $counter);

            $preview[] = [
                'id'            => $variant->id,
                'title'         => $variant->product->title ?? 'Unknown Product',
                'variant_title' => $variant->title ?? 'Default Variant',
                'vendor'        => $variant->product->vendor ?? '',
                'sku'           => $variant->sku ?? '',
                'image_url'     => $variant->image ?? ($variant->product->images[0]['src'] ?? null),
                'old_barcode'   => $cleanBarcode,           // ← NULL if empty or "-"
                'new_barcode'   => $newBarcode,
                'format'        => $format,
            ];

            $counter++;
        }

        // === Tab filtering ===
        $filtered = $preview;

        if ($tab === 'missing') {
            $filtered = array_filter($filtered, fn($i) => $i['old_barcode'] === null);
        } elseif ($tab === 'duplicates') {
            $groups = collect($filtered)
                ->whereNotNull('old_barcode')
                ->groupBy('old_barcode');

            $dupGroups = $groups->filter(fn($g) => $g->count() > 1);
            $filtered = $dupGroups->flatten(1)->values()->all();
        }

        // Search
        if ($request->filled('search')) {
            $q = strtolower($request->search);
            $filtered = array_filter(
                $filtered,
                fn($i) =>
                str_contains(strtolower($i['variant_title'] ?? ''), $q) ||
                    str_contains(strtolower($i['sku'] ?? ''), $q) ||
                    str_contains(strtolower($i['old_barcode'] ?? ''), $q) ||
                    str_contains(strtolower($i['new_barcode'] ?? ''), $q)
            );
        }

        $total = count($filtered);
        $paginated = array_slice($filtered, ($page - 1) * $perPage, $perPage);

        // === Duplicate groups for UI ===
        $duplicateGroups = [];
        if ($tab === 'duplicates') {
            $groups = collect($preview)
                ->whereNotNull('old_barcode')
                ->groupBy('old_barcode');

            foreach ($groups as $barcode => $items) {
                if ($items->count() > 1) {
                    $duplicateGroups[$barcode] = $items->values()->all();
                }
            }
        }

        return response()->json([
            'data'            => array_values($paginated),
            'total'           => $total,
            'duplicateGroups' => $duplicateGroups,
            'stats'           => $stats,
        ]);
    }
}
