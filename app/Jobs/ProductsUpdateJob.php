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
            $shop = User::where('name', $shopDomain)->firstOrFail();

            $data = is_array($this->data) ? $this->data : json_decode(json_encode($this->data), true);
            $productId = $data['id'] ?? null;
            if (!$productId) return;

            // Update Product
            $product = Product::updateOrCreate(
                ['shopify_id' => $productId, 'user_id' => $shop->id],
                [
                    'title'            => $data['title'] ?? '',
                    'description_html' => $data['body_html'] ?? null,
                    'status'           => strtoupper($data['status'] ?? 'draft'),
                    'vendor'           => $data['vendor'] ?? null,
                    'product_type'     => $data['product_type'] ?? null,
                    'tags'             => $this->normalizeTags($data['tags'] ?? []),
                    'images'           => collect($data['images'] ?? [])->map(fn($i) => [
                        'src' => $i['src'] ?? null,
                        'alt' => $i['alt'] ?? null,
                    ])->toArray(),
                    'updated_at'       => now(),
                ]
            );

            $variantInserts = [];
            $barcodeInserts  = [];

            foreach ($data['variants'] ?? [] as $v) {
                $shopifyVariantId = $v['id'] ?? null;
                if (!$shopifyVariantId) continue;

                $realBarcode = trim($v['barcode'] ?? '');
                $sku         = $v['sku'] ?? '';

                $finalBarcodeValue = !empty($realBarcode)
                    ? $realBarcode
                    : (!empty($sku) ? $sku : 'AUTO-' . $shopifyVariantId);

                // Variant upsert
                $variantInserts[] = [
                    'product_id'         => $product->id,
                    'shopify_variant_id' => $shopifyVariantId,
                    'title'              => $v['title'] ?? 'Default Title',
                    'sku'                => $sku,
                    'barcode'            => $realBarcode, // real barcode saved here
                    'price'              => (float)($v['price'] ?? 0),
                    'inventory_quantity' => (int)($v['inventory_quantity'] ?? 0),
                    'option1'            => $v['option1'] ?? null,
                    'option2'            => $v['option2'] ?? null,
                    'option3'            => $v['option3'] ?? null,
                    'image'              => $v['image']['src'] ?? null,
                    'image_alt'          => $v['image']['alt'] ?? null,
                    'updated_at'         => now(),
                    'created_at'         => now(),
                ];

                // Barcode upsert
                $barcodeInserts[] = [
                    'variant_id'     => $shopifyVariantId,
                    'product_id'     => $product->id,
                    'barcode_value'  => $finalBarcodeValue,
                    'format'         => 'UPC',
                    'image_url'      => null,
                    'is_duplicate'   => false,
                    'updated_at'     => now(),
                    'created_at'     => now(),
                ];
            }

            // Bulk upsert — super fast & safe
            if ($variantInserts) {
                Variant::upsert(
                    $variantInserts,
                    ['shopify_variant_id'],
                    ['title', 'sku', 'barcode', 'price', 'inventory_quantity', 'option1', 'option2', 'option3', 'image', 'image_alt', 'updated_at']
                );
            }

            if ($barcodeInserts) {
                Barcode::upsert(
                    $barcodeInserts,
                    ['variant_id'],
                    ['product_id', 'barcode_value', 'format', 'image_url', 'is_duplicate', 'updated_at']
                );
            }

            Log::info("ProductsUpdateJob completed", ['product_id' => $productId]);
        } catch (\Throwable $e) {
            Log::error("ProductsUpdateJob failed", ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    private function normalizeTags($raw): array
    {
        if (empty($raw)) return [];
        if (is_string($raw)) {
            return array_filter(array_map('trim', explode(',', $raw)));
        }
        return array_filter((array) $raw);
    }
}
