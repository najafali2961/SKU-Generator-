<?php

namespace App\Http\Controllers;

use App\Models\Variant;
use App\Jobs\GenerateBarcodeJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;

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

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page = max(1, (int)$request->input('page', 1));
        $perPage = 25;
        $tab = $request->input('tab', 'all');

        // Build base query
        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(
                fn($q) => $q
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
            );
        }

        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', "%{$request->vendor}%"));
        }

        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', "%{$request->type}%"));
        }

        $allVariants = $query->get();

        // === BARCODE GENERATION LOGIC ===
        $format = $request->input('format', 'UPC');
        $prefix = strtoupper(trim($request->input('prefix', '')));
        $length = (int)$request->input('length', 12);
        $checksum = $request->boolean('checksum', true);
        $enforce_length = $request->boolean('enforce_length', true);
        $numeric_only = $request->boolean('numeric_only', true);
        $auto_fill = $request->boolean('auto_fill', true);
        $allow_qr_text = $request->boolean('allow_qr_text', false);

        $counter = (int)($request->input('start_number', 1));
        $generatedBarcodes = [];

        foreach ($allVariants as $variant) {
            $oldBarcode = $variant->barcode;

            if ($format === 'QR') {
                $newBarcode = $allow_qr_text
                    ? ($variant->sku ?: "https://yourstore.com/products/{$variant->product->handle}")
                    : 'QR-' . strtoupper(\Str::random(12));
            } elseif ($format === 'CODE128') {
                $newBarcode = $prefix . ($variant->sku ?: "V{$variant->id}");
                if ($numeric_only) $newBarcode = preg_replace('/\D/', '', $newBarcode);
            } else {
                // UPC-A (12), EAN-13 (13), ISBN
                $targetLength = $format === 'UPC' ? 12 : ($format === 'ISBN' ? 13 : 13);
                $base = $prefix . ($variant->sku ? preg_replace('/\D/', '', $variant->sku) : $variant->id . $counter);

                if ($numeric_only) {
                    $base = preg_replace('/\D/', '', $base);
                }

                $code = substr($base, 0, $targetLength - ($checksum ? 1 : 0));

                if ($enforce_length || $auto_fill) {
                    $code = str_pad($code, $targetLength - ($checksum ? 1 : 0), '0', STR_PAD_LEFT);
                }

                if ($checksum && in_array($format, ['UPC', 'EAN13', 'ISBN'])) {
                    $code .= $this->calculateCheckDigit($code, $format === 'UPC' ? 12 : 13);
                }

                $newBarcode = $code;
            }

            $isDuplicate = false;
            if (!empty($newBarcode) && !str_starts_with($newBarcode, 'QR-')) {
                $generatedBarcodes[] = $newBarcode;
            }

            if ($tab === 'duplicates' && empty($newBarcode)) continue;

            $preview[] = [
                'id' => $variant->id,
                'variant_title' => $variant->title,
                'sku' => $variant->sku,
                'vendor' => $variant->product->vendor ?? '',
                'image_url' => $variant->image ?? ($variant->product->images[0]['src'] ?? null),
                'old_barcode' => $oldBarcode,
                'barcode_value' => $newBarcode,
                'format' => $format,
                'is_duplicate' => $isDuplicate, // will be updated below
            ];

            $counter++;
        }

        // Detect duplicates in NEW barcodes
        $dupCount = array_count_values(array_filter($generatedBarcodes));
        $duplicateValues = array_keys(array_filter($dupCount, fn($c) => $c > 1));

        foreach ($preview as &$item) {
            if (in_array($item['barcode_value'], $duplicateValues)) {
                $item['is_duplicate'] = true;
            }
        }

        // Filter for duplicates tab
        if ($tab === 'duplicates') {
            $preview = array_filter($preview, fn($i) => $i['is_duplicate']);
        }

        // Client-side search
        if ($request->filled('search')) {
            $q = strtolower($request->search);
            $preview = array_filter(
                $preview,
                fn($i) =>
                str_contains(strtolower($i['variant_title']), $q) ||
                    str_contains(strtolower($i['sku'] ?? ''), $q) ||
                    str_contains(strtolower($i['old_barcode'] ?? ''), $q) ||
                    str_contains(strtolower($i['barcode_value'] ?? ''), $q)
            );
        }

        $total = count($preview);
        $paginated = array_slice($preview, ($page - 1) * $perPage, $perPage);

        // Build duplicate groups
        $duplicateGroups = [];
        foreach ($duplicateValues as $code) {
            $items = array_filter($preview, fn($i) => $i['barcode_value'] === $code);
            $duplicateGroups[$code] = array_values($items);
        }

        return response()->json([
            'data' => array_values($paginated),
            'total' => $total,
            'duplicates' => $duplicateValues,
            'duplicateGroups' => $duplicateGroups,
        ]);
    }

    private function calculateCheckDigit($number, $type = 13)
    {
        $number = preg_replace('/\D/', '', $number);
        $number = str_pad($number, $type === 12 ? 11 : 12, '0', STR_PAD_LEFT);
        $sum = 0;
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $sum += ($i % 2 === ($type === 12 ? 1 : 0)) ? $number[$i] * 3 : $number[$i];
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

    public function progress()
    {
        $shop = Auth::user();
        $progress = Cache::get("barcode_progress_{$shop->id}", 0);
        return response()->json(['progress' => $progress]);
    }
}
