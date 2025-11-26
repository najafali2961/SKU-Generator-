<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Barcode;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
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
            $shop = User::where('name', $shopDomain)->first();

            if (!$shop) {
                Log::warning("ProductsDeleteJob: Shop not found", ['shop' => $shopDomain]);
                return;
            }

            $payload = is_array($this->data) ? $this->data : json_decode(json_encode($this->data), true);

            // Extract product ID — supports REST, GraphQL, and legacy payloads
            $shopifyProductId = null;

            if (!empty($payload['id'])) {
                $shopifyProductId = $payload['id'];
            } elseif (!empty($payload['product']['id'])) {
                $shopifyProductId = $this->extractId($payload['product']['id']);
            } elseif (!empty($payload['admin_graphql_api_id'])) {
                $shopifyProductId = $this->extractId($payload['admin_graphql_api_id']);
            }

            if (!$shopifyProductId) {
                Log::warning("ProductsDeleteJob: No product ID in payload", ['payload' => $payload]);
                return;
            }

            Log::info("ProductsDeleteJob: Deleting product", [
                'shopify_id' => $shopifyProductId,
                'shop'       => $shopDomain
            ]);

            // Start transaction for safety
            DB::transaction(function () use ($shop, $shopifyProductId) {
                // Option 1: Best — if you have foreign keys with ON DELETE CASCADE
                // Just delete the product → variants & barcodes auto-delete
                $deleted = Product::where('shopify_id', $shopifyProductId)
                    ->where('user_id', $shop->id)
                    ->delete();

                // Option 2: Manual delete (safe if no cascade)
                if (!$deleted) {
                    // Delete in correct order to avoid constraint errors
                    Variant::whereHas('product', function ($q) use ($shopifyProductId, $shop) {
                        $q->where('shopify_id', $shopifyProductId)
                            ->where('user_id', $shop->id);
                    })->delete();

                    Barcode::where('product_id', function ($q) use ($shopifyProductId, $shop) {
                        $q->select('id')
                            ->from('products')
                            ->where('shopify_id', $shopifyProductId)
                            ->where('user_id', $shop->id);
                    })->delete();

                    Product::where('shopify_id', $shopifyProductId)
                        ->where('user_id', $shop->id)
                        ->delete();
                }
            });

            Log::info("ProductsDeleteJob: Product deleted successfully", [
                'shopify_id' => $shopifyProductId,
                'shop'       => $shopDomain
            ]);
        } catch (\Throwable $e) {
            Log::error("ProductsDeleteJob FAILED", [
                'shopify_id' => $shopifyProductId ?? 'unknown',
                'shop'       => $shopDomain ?? 'unknown',
                'error'      => $e->getMessage(),
                'file'       => $e->getFile(),
                'line'       => $e->getLine(),
                'trace'      => substr($e->getTraceAsString(), 0, 2000)
            ]);

            // Don't rethrow — delete webhooks should not fail the queue
            // throw $e;
        }
    }

    private function extractId($gid): ?int
    {
        if (!$gid) return null;
        $parts = explode('/', (string)$gid);
        return (int)end($parts) ?: null;
    }
}
