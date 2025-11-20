<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\User;
use App\Models\Variant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;

class ProductsUpdateJob implements ShouldQueue
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
            Log::info("[JOB START] ProductsUpdateJob for shop: {$shopDomain}");

            $shop = User::where('name', $shopDomain)->first();
            if (!$shop) {
                Log::warning("[STEP] Shop not found", ['shopDomain' => $shopDomain]);
                return;
            }

            $data = json_decode(json_encode($this->data), true);
            if (!$data) {
                Log::warning("[STEP] Payload empty or invalid", ['data' => $this->data]);
                return;
            }

            $productId = $data['id'] ?? null;
            if (!$productId) {
                Log::warning("[STEP] Missing Shopify product ID");
                return;
            }

            // ---------- PRODUCT UPDATE ----------
            $productPayload = [
                'title' => $data['title'] ?? '',
                'description_html' => $data['body_html'] ?? null,
                'status' => strtoupper($data['status'] ?? 'DRAFT'),
                'vendor' => $data['vendor'] ?? null,
                'product_type' => $data['product_type'] ?? null,
                'tags' => $this->normalizeTags($data['tags'] ?? null),
                'images' => collect($data['images'] ?? [])
                    ->map(fn($i) => [
                        'src' => $i['src'] ?? null,
                        'alt' => $i['alt'] ?? null,
                    ])
                    ->toArray(),
            ];

            $product = Product::updateOrCreate(
                ['shopify_id' => $productId, 'user_id' => $shop->id],
                $productPayload
            );

            // ---------- VARIANTS UPDATE ----------
            foreach ($data['variants'] ?? [] as $v) {
                $sku = $v['sku'] ?? null;
                $variantId = $v['id'] ?? null;

                // Log every variant being processed
                Log::info("[VARIANT PROCESSING]", [
                    'shopify_variant_id' => $variantId,
                    'sku' => $sku,
                    'product_id' => $product->id
                ]);

                try {
                    // Only check duplicates if SKU exists
                    if ($sku && $variantId) {
                        $existing = Variant::where('sku', $sku)
                            ->where('shopify_variant_id', '<>', $variantId)
                            ->first();

                        if ($existing) {
                            Log::warning("[DUPLICATE SKU] Another variant exists with same SKU", [
                                'sku' => $sku,
                                'current_variant_id' => $variantId,
                                'existing_variant_id' => $existing->id
                            ]);
                        }
                    }

                    $variantPayload = [
                        'product_id' => $product->id,
                        'title' => $v['title'] ?? '',
                        'sku' => $sku,
                        'price' => $v['price'] ?? 0,
                        'inventory_quantity' => $v['inventory_quantity'] ?? 0,
                        'option1' => $v['option1'] ?? null,
                        'option2' => $v['option2'] ?? null,
                        'option3' => $v['option3'] ?? null,
                    ];

                    Variant::updateOrCreate(
                        ['shopify_variant_id' => $variantId, 'product_id' => $product->id],
                        $variantPayload
                    );

                    // Log success for variant update
                    Log::info("[VARIANT UPDATED]", [
                        'shopify_variant_id' => $variantId,
                        'sku' => $sku
                    ]);
                } catch (\Throwable $ve) {
                    Log::error("[ERROR] Variant update failed", [
                        'shopify_variant_id' => $variantId,
                        'product_id' => $product->id,
                        'sku' => $sku,
                        'error' => $ve->getMessage(),
                        'trace' => $ve->getTraceAsString(),
                    ]);
                }
            }

            Log::info("[JOB END] ProductsUpdateJob for shop: {$shopDomain}");
        } catch (\Throwable $e) {
            Log::error("[ERROR] ProductsUpdateJob failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    private function normalizeTags($raw)
    {
        if (!$raw) return [];
        if (is_string($raw)) return array_map('trim', explode(',', $raw));
        return (array) $raw;
    }
}
