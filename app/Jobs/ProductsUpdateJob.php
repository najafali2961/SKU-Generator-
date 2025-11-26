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

            $payload = is_array($this->data) ? $this->data : json_decode(json_encode($this->data), true);

            $productData = null;
            $isGraphQL   = false;

            // Detect payload type
            if (!empty($payload['product'])) {
                $productData = $payload['product'];
                $isGraphQL   = true;
            } elseif (!empty($payload['id'])) {
                $productData = $payload;
            } elseif (!empty($payload['admin_graphql_api_id'])) {
                $gid = $payload['admin_graphql_api_id'];
                $fresh = $shop->api()->graph(
                    'query($id: ID!) { product(id: $id) { id title descriptionHtml status vendor productType tags images(first:20){edges{node{id url altText}}} variants(first:100){edges{node{id title sku barcode price{amount} inventoryQuantity image{url altText} imageId selectedOptions{name value}}}}}}',
                    ['id' => $gid]
                );
                $productData = $fresh['body']['data']['product'] ?? null;
                $isGraphQL = true;
            }

            if (!$productData) {
                Log::warning("No product data found in webhook", $payload);
                return;
            }

            $shopifyProductId = $isGraphQL
                ? $this->extractId($productData['id'] ?? null)
                : ($productData['id'] ?? null);

            if (!$shopifyProductId) return;

            // Save product
            $product = Product::updateOrCreate(
                ['shopify_id' => $shopifyProductId, 'user_id' => $shop->id],
                [
                    'title'            => $productData['title'] ?? 'Untitled',
                    'description_html' => $productData['descriptionHtml'] ?? $productData['body_html'] ?? null,
                    'status'           => strtoupper($productData['status'] ?? 'DRAFT'),
                    'vendor'           => $productData['vendor'] ?? null,
                    'product_type'     => $productData['productType'] ?? $productData['product_type'] ?? null,
                    'tags'             => $this->normalizeTags($productData['tags'] ?? []),
                    'images'           => $this->extractImages($productData, $isGraphQL),
                    'updated_at'       => now(),
                ]
            );

            // Build image map (keyed by image ID)
            $imageMap = $this->buildImageMap($productData, $isGraphQL);

            $variantEdges = $isGraphQL
                ? ($productData['variants']['edges'] ?? [])
                : ($productData['variants'] ?? []);

            $variantInserts = [];
            $barcodeInserts  = [];

            foreach ($variantEdges as $edge) {
                $v = $isGraphQL ? ($edge['node'] ?? []) : $edge;
                if (empty($v['id'])) continue;

                $shopifyVariantId = $isGraphQL ? $this->extractId($v['id']) : ($v['id'] ?? null);
                if (!$shopifyVariantId) continue;

                // FINAL IMAGE RESOLUTION — THIS WORKS 100%
                $imageSrc = null;
                $imageAlt = null;

                // 1. Direct image object (GraphQL or rare REST)
                if (!empty($v['image'])) {
                    $img = $v['image'];
                    $imageSrc = $img['url'] ?? $img['src'] ?? $img['originalSrc'] ?? null;
                    $imageAlt = $img['altText'] ?? $img['alt'] ?? null;
                }

                // 2. Use image_id (REST) or imageId (GraphQL)
                if (!$imageSrc) {
                    $imageIdField = $isGraphQL ? 'imageId' : 'image_id';
                    $rawImageId   = $v[$imageIdField] ?? null;

                    if ($rawImageId) {
                        $imageId = $isGraphQL ? $this->extractId($rawImageId) : $rawImageId;
                        if ($imageMap->has($imageId)) {
                            $imgData  = $imageMap->get($imageId);
                            $imageSrc = $imgData['src'];
                            $imageAlt = $imgData['alt'];
                        }
                    }
                }

                // 3. Fallback: first product image
                if (!$imageSrc && $imageMap->count() > 0) {
                    $first    = $imageMap->values()->first();
                    $imageSrc = $first['src'];
                    $imageAlt = $first['alt'];
                }

                // Options
                $options = $isGraphQL
                    ? collect($v['selectedOptions'] ?? [])->pluck('value')->pad(3, null)->toArray()
                    : [$v['option1'] ?? null, $v['option2'] ?? null, $v['option3'] ?? null];

                // Price
                $price = $isGraphQL
                    ? (float)($v['price']['amount'] ?? $v['price'] ?? 0)
                    : (float)($v['price'] ?? 0);

                $sku = trim($v['sku'] ?? '');
                $barcodeRaw = trim($v['barcode'] ?? '');
                $finalBarcode = $barcodeRaw ?: ($sku ?: "AUTO-{$shopifyVariantId}");

                $variantInserts[] = [
                    'product_id'         => $product->id,
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
                    'created_at'         => now(),
                ];

                $barcodeInserts[] = [
                    'variant_id'     => $shopifyVariantId,
                    'product_id'     => $product->id,
                    'barcode_value'  => $finalBarcode,
                    'format'         => 'UPC',
                    'image_url'      => null,
                    'is_duplicate'   => false,
                    'updated_at'     => now(),
                    'created_at'     => now(),
                ];
            }

            if ($variantInserts) {
                Variant::upsert(
                    $variantInserts,
                    ['shopify_variant_id'],
                    ['product_id', 'title', 'sku', 'barcode', 'price', 'inventory_quantity', 'option1', 'option2', 'option3', 'image', 'image_alt', 'updated_at']
                );
            }

            if ($barcodeInserts) {
                Barcode::upsert(
                    $barcodeInserts,
                    ['variant_id'],
                    ['product_id', 'barcode_value', 'format', 'image_url', 'is_duplicate', 'updated_at']
                );
            }

            Log::info("ProductsUpdateJob SUCCESS", [
                'product_id'         => $shopifyProductId,
                'is_graphql'         => $isGraphQL,
                'variants_processed' => count($variantInserts),
                'images_saved'       => collect($variantInserts)->filter(fn($v) => !empty($v['image']))->count()
            ]);
        } catch (\Throwable $e) {
            Log::error("ProductsUpdateJob FAILED", [
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    // ———————————————————— FIXED HELPERS ————————————————————
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

    private function normalizeTags($raw): array
    {
        if (empty($raw)) return [];
        if (is_string($raw)) {
            return array_filter(array_map('trim', explode(',', $raw)));
        }
        return array_filter((array)$raw);
    }
}
