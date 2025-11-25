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

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page = max(1, (int)$request->input('page', 1));
        $perPage = 25;
        $tab = $request->input('tab', 'all');

        $query = Variant::with(['product'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters (search, vendor, type)
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

        $format = $request->input('format', 'UPC');
        $prefix = strtoupper(trim($request->input('prefix', '')));
        $counter = (int)($request->input('start_number', 1));
        $generatedBarcodes = collect();
        $preview = [];

        foreach ($allVariants as $variant) {
            $oldBarcode = trim($variant->barcode ?? '');
            $hasOldBarcode = !empty($oldBarcode);

            $newBarcode = $this->generateBarcode($variant, $request->all(), $counter);

            // Track new barcodes to detect duplicates
            if ($newBarcode && !str_starts_with($newBarcode, 'QR-') === false) {
                $generatedBarcodes->push($newBarcode);
            }

            $preview[] = [
                'id'            => $variant->id,
                'variant_title' => $variant->title ?? 'Default Variant',
                'sku'           => $variant->sku ?? '',
                'vendor'        => $variant->product->vendor ?? '',
                'image_url'     => $variant->image ?? ($variant->product->images[0]['src'] ?? null),
                'old_barcode'   => $hasOldBarcode ? $oldBarcode : null,
                'barcode_value' => $newBarcode,
                'format'        => $format,
            ];

            $counter++;
        }

        // Detect duplicates in NEW barcodes
        $dupCount = $generatedBarcodes->countBy();
        $duplicates = $dupCount->filter(fn($count) => $count > 1)->keys()->all();

        // Final status logic
        foreach ($preview as &$item) {
            $hasOld = $item['old_barcode'] !== null;
            $isDup = in_array($item['barcode_value'], $duplicates);

            if (!$item['barcode_value']) {
                $item['status'] = 'empty';
            } elseif ($isDup) {
                $item['status'] = 'duplicate';
            } elseif ($hasOld) {
                $item['status'] = 'unique'; // has old barcode → Unique
            } else {
                $item['status'] = 'unique'; // no old barcode, but new one → still Unique
            }
        }
        unset($item); // break reference

        // Filter duplicates tab
        if ($tab === 'duplicates') {
            $preview = array_filter($preview, fn($i) => $i['status'] === 'duplicate');
        }

        // Search
        if ($request->filled('search')) {
            $q = strtolower(trim($request->search));
            $preview = array_filter(
                $preview,
                fn($i) =>
                str_contains(strtolower($i['variant_title'] ?? ''), $q) ||
                    str_contains(strtolower($i['sku'] ?? ''), $q) ||
                    str_contains(strtolower($i['old_barcode'] ?? ''), $q) ||
                    str_contains(strtolower($i['barcode_value'] ?? ''), $q)
            );
        }

        $total = count($preview);
        $paginated = array_slice($preview, ($page - 1) * $perPage, $perPage);

        // Duplicate groups
        $duplicateGroups = [];
        foreach ($duplicates as $code) {
            $items = array_filter($preview, fn($i) => $i['barcode_value'] === $code);
            if (count($items) > 1) {
                $duplicateGroups[$code] = array_values($items);
            }
        }

        return response()->json([
            'data' => array_values($paginated),
            'total' => $total,
            'duplicateGroups' => $duplicateGroups,
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

    public function progress()
    {
        $shop = Auth::user();
        $progress = Cache::get("barcode_progress_{$shop->id}", 0);
        return response()->json(['progress' => $progress]);
    }
}
