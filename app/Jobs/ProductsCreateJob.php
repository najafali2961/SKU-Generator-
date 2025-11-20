<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Objects\Values\ShopDomain;

class ProductsCreateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopDomain;
    public $data;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
    }

    protected function normalizeTags($raw): array
    {
        if (!$raw) return [];

        $tags = is_string($raw)
            ? array_filter(array_map('trim', explode(',', $raw)))
            : (array) $raw;

        return array_values(array_unique($tags));
    }

    public function handle()
    {
        $start = microtime(true);

        try {
            $shopDomain = ShopDomain::fromNative($this->shopDomain)->toNative();
            $shop = \App\Models\User::where('name', $shopDomain)->first();

            if (!$shop) {
                Log::warning("⚠ ProductsCreateJob: shop not found", ['shop' => $shopDomain]);
                return;
            }

            $data = json_decode(json_encode($this->data), true) ?? [];
            $shopifyId = $data['id'] ?? null;

            if (!$shopifyId) {
                Log::warning("⚠ ProductsCreateJob: missing product ID");
                return;
            }

            /* ---------- TAGS ---------- */
            $tags = $this->normalizeTags($data['tags'] ?? $data['tag'] ?? null);

            /* ---------- IMAGES ---------- */
            $images = collect($data['images'] ?? [])
                ->map(fn($img) => [
                    'src' => $img['src'] ?? null,
                    'alt' => $img['alt'] ?? $img['altText'] ?? null,
                ])->toArray();

            /* ---------- VARIANTS ---------- */
            $variants = collect($data['variants'] ?? [])
                ->map(fn($var) => [
                    'id'    => $var['id'] ?? null,
                    'title' => $var['title'] ?? '',
                    'sku'   => $var['sku'] ?? '',
                    'price' => $var['price'] ?? 0,
                    'stock' => $var['inventory_quantity'] ?? $var['inventoryQuantity'] ?? 0,
                    'weight' => $var['weight'] ?? 0,
                    'weight_unit' => $var['weight_unit'] ?? null,
                ])->toArray();

            /* ---------- SAVE PRODUCT ---------- */
            $payload = [
                'title' => $data['title'] ?? 'Untitled',
                'description_html' => $data['body_html'] ?? null,
                'status' => strtoupper($data['status'] ?? 'DRAFT'),
                'vendor' => $data['vendor'] ?? null,
                'product_type' => $data['product_type'] ?? null,
                'tags' => $tags,
                'images' => $images,
                'variants' => $variants,
            ];

            \App\Models\Product::updateOrCreate(
                ['shopify_id' => (string)$shopifyId, 'user_id' => $shop->id],
                $payload
            );

            $timeMs = round((microtime(true) - $start) * 1000);
        } catch (\Throwable $e) {
            Log::error("❌ ProductsCreateJob FAILED", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
