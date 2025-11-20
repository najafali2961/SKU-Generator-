<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;

class ProductsDeleteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopDomain;
    public $data;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
    }

    public function handle()
    {

        try {



            $shopDomain = ShopDomain::fromNative($this->shopDomain)->toNative();
            $shop = \App\Models\User::where('name', $shopDomain)->first();

            if (!$shop) {
                Log::warning("❌ Shop not found for delete", [
                    'shop' => $shopDomain
                ]);
                return;
            }
            $productId = $this->data->id ?? null;

            if (!$productId) {
                Log::warning("❌ DELETE webhook missing product ID", [
                    'payload' => $this->data
                ]);
                return;
            }

            $deleted = \App\Models\Product::where('shopify_id', $productId)
                ->where('user_id', $shop->id)
                ->delete();

            if ($deleted) {
            } else {
                Log::warning("⚠ Product not found to delete", [
                    'product_id' => $productId,
                    'shop' => $shopDomain
                ]);
            }
        } catch (\Throwable $e) {
            Log::error("🔥 PRODUCTS_DELETE ERROR", [
                'line' => $e->getLine(),
                'file' => $e->getFile(),
                'msg' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 1500),
            ]);
        }
    }
}
