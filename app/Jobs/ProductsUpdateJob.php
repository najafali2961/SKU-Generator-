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
use Illuminate\Support\Facades\Cache;

class ProductsUpdateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopDomain;
    public $data;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
        $this->onQueue('webhooks');
    }

    public function handle()
    {
        try {
            $domain = $this->shopDomain;
            
            // Cache lookup for Shop (1 hour)
            $shop = Cache::remember("shop_obj_{$domain}", 3600, function () use ($domain) {
                return User::where('name', $domain)->first();
            });

            if (!$shop) {
                return;
            }

            // Standardize Input
            $payload = is_array($this->data) ? $this->data : json_decode(json_encode($this->data), true);
            
            $productData = null;
            $isGraphQL   = false;

            if (!empty($payload['product'])) {
                $productData = $payload['product'];
                $isGraphQL   = true;
            } elseif (!empty($payload['id'])) {
                $productData = $payload;
            }

            if (!$productData) return;

            $shopifyProductId = $isGraphQL
                ? $this->extractId($productData['id'] ?? null)
                : ($productData['id'] ?? null);

            if (!$shopifyProductId) return;

            // 1. Upsert Product
            $product = Product::updateOrCreate(
                ['shopify_id' => $shopifyProductId, 'user_id' => $shop->id],
                [
                    'title'            => $productData['title'] ?? 'Untitled',
                    'handle'           => $productData['handle'] ?? null,
                    'description_html' => $productData['descriptionHtml'] ?? $productData['body_html'] ?? null,
                    'status'           => strtoupper($productData['status'] ?? 'DRAFT'),
                    'vendor'           => $productData['vendor'] ?? null,
                    'product_type'     => $productData['productType'] ?? $productData['product_type'] ?? null,
                    'tags'             => $this->normalizeTags($productData['tags'] ?? null),
                    'images'           => $this->extractImages($productData, $isGraphQL),
                    'updated_at'       => now(),
                ]
            );

            // 2. Variants & Barcodes
            $imageMap = $this->buildImageMap($productData, $isGraphQL);
            
            $variantsList = $isGraphQL
                ? ($productData['variants']['edges'] ?? [])
                : ($productData['variants'] ?? []);

            $variantUpserts = [];
            $barcodeUpserts = [];

            foreach ($variantsList as $vNode) {
                $v = $isGraphQL ? ($vNode['node'] ?? []) : $vNode;
                if (empty($v['id'])) continue;

                $shopifyVariantId = $isGraphQL ? $this->extractId($v['id']) : ($v['id'] ?? null);
                if (!$shopifyVariantId) continue;

                // Image Resolution
                $imageSrc = null;
                $imageAlt = null;
                
                if (!empty($v['image'])) {
                    $img = $v['image'];
                    $imageSrc = $img['url'] ?? $img['src'] ?? $img['originalSrc'] ?? null;
                    $imageAlt = $img['altText'] ?? $img['alt'] ?? null;
                }
                
                if (!$imageSrc) {
                    $imageIdField = $isGraphQL ? 'imageId' : 'image_id';
                    $rawImageId   = $v[$imageIdField] ?? null;
                    if ($rawImageId) {
                        $imageId = $isGraphQL ? $this->extractId($rawImageId) : $rawImageId;
                        if ($imageMap->has($imageId)) {
                            $imgData = $imageMap->get($imageId);
                            $imageSrc = $imgData['src'];
                            $imageAlt = $imgData['alt'];
                        }
                    }
                }
                
                if (!$imageSrc && $imageMap->count() > 0) {
                    $first = $imageMap->values()->first();
                    $imageSrc = $first['src'];
                    $imageAlt = $first['alt'];
                }

                $options = $isGraphQL
                    ? collect($v['selectedOptions'] ?? [])->pluck('value')->pad(3, null)->toArray()
                    : [$v['option1'] ?? null, $v['option2'] ?? null, $v['option3'] ?? null];

                $price = $isGraphQL
                    ? (float)($v['price']['amount'] ?? $v['price'] ?? 0)
                    : (float)($v['price'] ?? 0);

                $sku = trim($v['sku'] ?? '');
                $barcodeRaw = trim($v['barcode'] ?? '');
                $finalBarcode = $barcodeRaw ?: ($sku ?: "AUTO-{$shopifyVariantId}");

                $variantUpserts[] = [
                    'product_id'         => $product->id, // We have the ID now!
                    'shopify_variant_id' => $shopifyVariantId,
                    'title'              => $v['title'] ?? 'Default Title',
                    'sku'                => $sku ?: null,
                    'barcode'            => $barcodeRaw ?: null,
                    'price'              => $price,
                    'inventory_quantity' => (int)($v['inventoryQuantity'] ?? $v['inventory_quantity'] ?? 0),
                    'option1'            => $options[0],
                    'option2'            => $options[1],
                    'option3'            => $options[2],
                    'image'              => $imageSrc,
                    'image_alt'          => $imageAlt,
                    'updated_at'         => now(),
                ];

                $barcodeUpserts[] = [
                    'variant_id'     => $shopifyVariantId,
                    'product_id'     => $product->id,
                    'barcode_value'  => $finalBarcode,
                    'format'         => 'UPC',
                    'image_url'      => null,
                    'is_duplicate'   => false,
                    'updated_at'     => now(),
                ];
            }

            if (!empty($variantUpserts)) {
                Variant::upsert(
                    $variantUpserts,
                    ['shopify_variant_id'],
                    ['product_id', 'title', 'sku', 'barcode', 'price', 'inventory_quantity', 'option1', 'option2', 'option3', 'image', 'image_alt', 'updated_at']
                );
            }

            if (!empty($barcodeUpserts)) {
                Barcode::upsert(
                    $barcodeUpserts,
                    ['variant_id'],
                    ['product_id', 'barcode_value', 'format', 'image_url', 'is_duplicate', 'updated_at']
                );
            }

        } catch (\Throwable $e) {
             Log::error("ProductsUpdateJob Failed: " . $e->getMessage());
        }
    }

    // ———————————————————— HELPERS ————————————————————
    private function extractId($gid): ?int
    {
        if (!$gid) return null;
        $parts = explode('/', (string)$gid);
        return (int)end($parts) ?: null;
    }

    private function extractImages($data, bool $isGraphQL): array
    {
        $images = $isGraphQL ? ($data['images']['edges'] ?? []) : ($data['images'] ?? []);
        return collect($images)->map(function ($item) use ($isGraphQL) {
            $node = $isGraphQL ? ($item['node'] ?? $item) : $item;
            return [
                'src' => $node['url'] ?? $node['src'] ?? $node['originalSrc'] ?? null,
                'alt' => $node['altText'] ?? $node['alt'] ?? null,
            ];
        })->toArray();
    }

    private function buildImageMap($data, bool $isGraphQL): \Illuminate\Support\Collection
    {
        $images = $isGraphQL ? ($data['images']['edges'] ?? []) : ($data['images'] ?? []);
        return collect($images)->mapWithKeys(function ($item) use ($isGraphQL) {
            $node    = $isGraphQL ? ($item['node'] ?? $item) : $item;
            $imgId   = $isGraphQL ? $this->extractId($node['id'] ?? null) : ($node['id'] ?? null);
            return [
                $imgId => [
                    'src' => $node['url'] ?? $node['src'] ?? $node['originalSrc'] ?? null,
                    'alt' => $node['altText'] ?? $node['alt'] ?? null,
                ]
            ];
        });
    }

    private function normalizeTags($raw): ?string
    {
        if (empty($raw)) return null;
        if (is_object($raw) && method_exists($raw, 'toArray')) $tags = $raw->toArray();
        elseif (is_array($raw)) $tags = $raw;
        elseif (is_string($raw)) $tags = array_map('trim', explode(',', $raw));
        else $tags = (array)$raw;
        
        $tags = array_filter(array_unique(array_map('trim', $tags)));
        return !empty($tags) ? implode(', ', $tags) : null;
    }
}
