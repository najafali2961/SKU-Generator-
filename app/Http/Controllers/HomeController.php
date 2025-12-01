<?php

namespace App\Http\Controllers;

use App\Models\JobLog;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        $shop = Auth::user();

        // Base query – only variants that belong to this shop’s products
        $baseQuery = Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        $stats = [
            'total_variants'         => $baseQuery->count(),

            // With SKU
            'variants_with_sku'      => (clone $baseQuery)
                ->whereNotNull('sku')
                ->where('sku', '!=', '')
                ->count(),

            // Missing SKU
            'variants_missing_sku'   => (clone $baseQuery)
                ->where(function ($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                })
                ->count(),

            // With Barcode
            'variants_with_barcode' => (clone $baseQuery)
                ->whereNotNull('barcode')
                ->where('barcode', '!=', '')
                ->count(),

            // Missing Barcode
            'variants_missing_barcode' => (clone $baseQuery)
                ->where(function ($q) {
                    $q->whereNull('barcode')->orWhere('barcode', '');
                })
                ->count(),

            'total_products'         => Product::where('user_id', $shop->id)->count(),

            // Change this to whatever makes sense for your app
            'active_stores'          => \App\Models\User::count(),
        ];
        return Inertia::render('Home', [
            'stats' => $stats,
            'recentJobs' => JobLog::where('user_id', $shop->id)->latest()->limit(10)->get()

        ]);
    }
}
