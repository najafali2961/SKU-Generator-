<?php


namespace App\Http\Controllers;

use App\Jobs\BulkEditProducts;
use App\Services\ShopifyService;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $shop = Auth::user();

        $productsPaginated = Product::where('user_id', $shop->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10); // 10 per page

        // Transform products for frontend
        $products = $productsPaginated->getCollection()->map(function ($p) {
            return [
                'id' => $p->id,
                'shopify_id' => $p->shopify_id,
                'title' => $p->title,
                'status' => $p->status,
                'vendor' => $p->vendor,
                'tags' => implode(', ', $p->tags ?? []),
                'images' => $p->images ?? [],
            ];
        });

        // Send both products and pagination meta
        return Inertia::render('Products/Index', [
            'products' => $products,
            'meta' => [
                'current_page' => $productsPaginated->currentPage(),
                'last_page' => $productsPaginated->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $shop = Auth::user();

        $product = Product::where('user_id', $shop->id)
            ->where('id', $id)
            ->firstOrFail();

        return Inertia::render('Products/Show', [
            'product' => $product,
        ]);
    }

    public function bulkEdit(Request $request)
    {
        $shop = Auth::user();

        $page = $request->get('page', 1); // get ?page= from URL, default to 1

        $productsPaginated = Product::where('user_id', $shop->id)
            ->orderBy('id', 'desc')
            ->paginate(10, ['*'], 'page', $page); // pass page number

        $products = $productsPaginated->getCollection()->map(function ($p) {
            return [
                'id'        => $p->id,
                'title'     => $p->title,
                'status'    => $p->status,
                'vendor'    => $p->vendor,
                'tags'      => implode(', ', $p->tags ?? []),
                'images'    => $p->images ?? [],
            ];
        });

        return Inertia::render('Products/BulkEdit', [
            'products' => $products,
            'meta' => [
                'current_page' => $productsPaginated->currentPage(),
                'last_page'    => $productsPaginated->lastPage(),
            ]
        ]);
    }


    public function allIds()
    {
        $shop = Auth::user();
        $ids = Product::where('user_id', $shop->id)->pluck('id');
        return response()->json(['ids' => $ids]);
    }
    public function bulkEditApply(Request $request)
    {
        $shop = Auth::user();

        $request->validate([
            'product_ids' => 'required|array',
            'field'       => 'required|string',
            'value'       => 'nullable|string',
        ]);

        $chunkSize = 100; // adjust based on memory and Shopify API limits
        $chunks = array_chunk($request->product_ids, $chunkSize);

        foreach ($chunks as $chunk) {
            BulkEditProducts::dispatch($shop->id, $chunk, $request->field, $request->value);
        }

        return back()->with('success', 'Products are being updated in the background.');
    }
}
