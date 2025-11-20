<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        $shop = Auth::user();

        // Fetch stats
        $stats = [
            'total_products' => Product::where('user_id', $shop->id)->count(),
            'updated_products' => Product::where('user_id', $shop->id)
                ->whereNotNull('updated_at')
                ->count(),
            'draft_items' => Product::where('user_id', $shop->id)
                ->where('status', 'DRAFT')
                ->count(),
        ];

        $products = Product::where('user_id', $shop->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($p) {

                // Extract container tags safely
                $tags = $p->tags['container'] ?? [];

                // Images are already array due to $casts or JSON column
                $images = $p->images ?? [];

                return [
                    'id' => $p->id,
                    'shopify_id' => $p->shopify_id,
                    'title' => $p->title,
                    'status' => $p->status,
                    'vendor' => $p->vendor,
                    'tags' => is_array($tags) ? implode(', ', $tags) : '',
                    'images' => $images,
                ];
            });

        return Inertia::render('Home', [
            'stats' => $stats,
            'products' => $products,
        ]);
    }
}
