<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Variant;
use App\Models\Barcode;
use Illuminate\Support\Facades\Auth;

class BarcodeController extends Controller
{
    public function index()
    {
        $shop = Auth::user();

        $variants = Variant::with(['product', 'barcode'])
            ->whereHas('product', function ($q) use ($shop) {
                $q->where('user_id', $shop->id);
            })
            ->latest()
            ->take(50)
            ->get();

        return Inertia::render('BarcodeGenerator', [
            'initialData' => $variants->map(function ($v) {
                return [
                    'id'                 => $v->id,
                    'shopify_variant_id' => $v->shopify_variant_id,
                    'product_title'      => $v->product?->title ?? 'Unknown Product',
                    'variant_title'      => $v->title,
                    'sku'                => $v->sku,
                    'barcode_value'      => $v->barcode?->barcode_value,
                    'format'             => $v->barcode?->format ?? 'UPC',
                    'image_url'          => $v->image ?? ($v->product?->images[0]['src'] ?? null),
                    'is_duplicate'       => $v->barcode?->is_duplicate ?? false,
                    'is_empty'           => empty($v->barcode?->barcode_value) || str_starts_with($v->barcode?->barcode_value ?? '', 'AUTO-'),
                    'is_auto'            => str_starts_with($v->barcode?->barcode_value ?? '', 'AUTO-'),
                ];
            })->values(),
        ]);
    }

    public function preview(Request $request)
    {
        $shop = Auth::user();
        if (!$shop) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $perPage = 25;
        $page = max(1, (int) $request->input('page', 1));

        $query = Variant::with(['product', 'barcode'])
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Filters
        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', "%{$request->vendor}%"));
        }

        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', "%{$request->type}%"));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(
                fn($q) =>
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhereHas('barcode', fn($bq) => $bq->where('barcode_value', 'like', "%{$search}%"))
            );
        }

        $variants = $query->get();

        // Collect barcode values and detect duplicates
        $barcodeValues = [];
        $realBarcodes = [];

        foreach ($variants as $v) {
            $value = $v->barcode?->barcode_value ?? null;
            $barcodeValues[$v->shopify_variant_id] = $value;

            if ($value && !str_starts_with($value, 'AUTO-') && trim($value) !== '') {
                $realBarcodes[] = $value;
            }
        }

        $duplicateValues = array_keys(array_filter(array_count_values($realBarcodes), fn($c) => $c > 1));

        $preview = $variants->map(function ($v) use ($duplicateValues) {
            $value = $v->barcode; // Use variant's barcode field directly
            $isEmpty = empty($value) || str_starts_with($value, 'AUTO-');

            return [
                'id'                 => $v->id,
                'shopify_variant_id' => $v->shopify_variant_id,
                'variant_title'      => $v->title,
                'sku'                => $v->sku,
                'vendor'             => $v->product?->vendor ?? null,
                'barcode_value'      => $value,
                'old_barcode'        => null, // optional if you track old barcode elsewhere
                'format'             => 'UPC', // or dynamically if you store format
                'image_url'          => $v->image,
                'is_duplicate'       => !$isEmpty && in_array($value, $duplicateValues),
                'is_empty'           => $isEmpty,
                'is_auto'            => str_starts_with($value ?? '', 'AUTO-'),
            ];
        });


        $total = $preview->count();
        $paginated = $preview->forPage($page, $perPage)->values();

        return response()->json([
            'data' => $paginated,
            'total' => $total,
            'summary' => [
                'total' => $total,
                'unique' => count(array_unique($realBarcodes)),
                'duplicates' => count($duplicateValues),
                'empty_or_auto' => $variants->filter(fn($v) => empty($v->barcode?->barcode_value) || str_starts_with($v->barcode?->barcode_value ?? '', 'AUTO-'))->count(),
            ],
        ]);
    }
}
