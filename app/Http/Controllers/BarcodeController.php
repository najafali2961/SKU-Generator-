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
        $variants = Variant::with('product')
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->take(20)
            ->get();

        return Inertia::render('BarcodeGenerator', [
            'barcodes' => [
                'data' => $variants->map(fn($v) => [
                    'id' => $v->id,
                    'barcode_value' => $v->barcode?->barcode_value,
                    'format' => $v->barcode?->format ?? 'UPC',
                    'image_url' => $v->image ?? $v->product?->image,
                    'product' => $v->product ? [
                        'title' => $v->product->title,
                    ] : null,
                    'is_duplicate' => $v->barcode?->is_duplicate ?? false,
                ])->toArray()
            ]
        ]);
    }

    public function preview(Request $request)
    {
        $shop = Auth::user();
        $page = max(1, (int) $request->page, 1);
        $perPage = 25;

        $query = Variant::with('product')
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if ($request->filled('vendor')) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', "%{$request->vendor}%"));
        }
        if ($request->filled('type')) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', "%{$request->type}%"));
        }

        $allVariants = $query->get();

        $barcodeMap = Barcode::whereIn('variant_id', $allVariants->pluck('id'))
            ->pluck('barcode_value', 'variant_id')
            ->toArray();

        // detect duplicates
        $counts = array_count_values(array_filter(array_values($barcodeMap)));
        $duplicates = array_keys(array_filter($counts, fn($c) => $c > 1));

        $preview = $allVariants->map(fn($v) => [
            'id' => $v->id,
            'barcode_value' => $barcodeMap[$v->id] ?? null,
            'format' => $v->barcode?->format ?? 'UPC',
            'image_url' => $v->image ?? $v->product?->image,
            'product' => $v->product ? ['title' => $v->product->title] : null,
            'is_duplicate' => in_array($barcodeMap[$v->id] ?? null, $duplicates),
        ]);

        $total = $preview->count();
        $paginated = $preview->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paginated,
            'total' => $total,
            'duplicates' => $duplicates,
        ]);
    }
}
