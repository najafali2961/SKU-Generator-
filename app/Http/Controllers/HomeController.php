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
        /** @var \App\Models\User $shop */
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

        $plan = $shop->plan;
        $planName = $plan ? $plan->name : ($shop->isFreemium() ? 'Freemium' : 'None');
        $monthlyCredits = $plan ? $plan->monthly_credits : 0; // Adjust as needed for freemium via config if >0

        $credits = [
            'plan_name' => $planName,
            'available' => $shop->getAvailableCredits(),
            'used' => $shop->credits_used,
            'total' => $monthlyCredits,
            'unlimited' => $shop->hasUnlimitedCredits(),
        ];

        return Inertia::render('Home', [
            'stats' => $stats,
            'credits' => $credits,
            'recentJobs' => JobLog::where('user_id', $shop->id)->latest()->limit(10)->get()
        ]);
    }
}
