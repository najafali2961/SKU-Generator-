<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Barcode; // <-- Make sure this is imported
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchProductPageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [10, 30, 60, 120, 300];
    public $timeout = 180;

    protected $shopId;
    protected $afterCursor;

    public function __construct($shopId, $afterCursor)
    {
        $this->shopId = $shopId;
        $this->afterCursor = $afterCursor;
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);
        if (!$shop) {
            Log::error("Shop not found in FetchProductPageJob: {$this->shopId}");
            return;
        }

        try {
            $response = $shop->api()->graph(
                <<<'GRAPHQL'
                query ($first: Int!, $after: String) {
                  products(first: $first, after: $after) {
                    edges {
                      node {
                        id
                        title
                        bodyHtml
                        status
                        vendor
                        productType
                        tags
                        images(first: 20) {
                          edges {
                            node {
                              src
                              altText
                            }
                          }
                        }
                        variants(first: 100) {
                          edges {
                            node {
                              id
                              title
                              sku
                              price
                              inventoryQuantity
                              image {
                                src
                                altText
                              }
                              selectedOptions {
                                value
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
                GRAPHQL,
                ['first' => 250, 'after' => $this->afterCursor]
            );
        } catch (\Exception $e) {
            Log::error("GraphQL failed in FetchProductPageJob: " . $e->getMessage());
            $this->fail($e);
            return;
        }

        $edges = $response['body']['data']['products']['edges'] ?? [];
        if (empty($edges)) {
            Log::info("No products returned for cursor: {$this->afterCursor}");
            return;
        }

        foreach ($edges as $edge) {
            $node = $edge['node'] ?? [];

            if (empty($node['id'])) {
                Log::warning("Skipping product with no ID");
                continue;
            }

            try {
                $shopifyId = intval(basename($node['id']));

                // === TAGS ===
                $rawTags = $node['tags'] ?? [];
                if ($rawTags instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                    $rawTags = $rawTags->toArray();
                }
                $tags = is_array($rawTags)
                    ? array_filter($rawTags)
                    : (is_string($rawTags) ? array_filter(array_map('trim', explode(',', $rawTags))) : []);

                // === PRODUCT IMAGES ===
                $productImages = [];
                $imageEdges = $node['images']['edges'] ?? [];
                if ($imageEdges instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                    $imageEdges = $imageEdges->toArray();
                }
                foreach ($imageEdges as $img) {
                    $imgNode = $img['node'] ?? [];
                    if ($imgNode instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                        $imgNode = $imgNode->toArray();
                    }
                    $productImages[] = [
                        'src' => $imgNode['src'] ?? $imgNode['originalSrc'] ?? null,
                        'alt' => $imgNode['altText'] ?? null,
                    ];
                }

                // === SAVE PRODUCT ===
                $product = Product::updateOrCreate(
                    ['shopify_id' => $shopifyId, 'user_id' => $shop->id],
                    [
                        'title'            => $node['title'] ?? 'Untitled Product',
                        'description_html' => $node['bodyHtml'] ?? null,
                        'status'           => $node['status'] ?? 'draft',
                        'vendor'           => $node['vendor'] ?? null,
                        'product_type'     => $node['productType'] ?? null,
                        'tags'             => $tags,
                        'images'           => $productImages,
                        'updated_at'       => now(),
                    ]
                );

                // === VARIANTS & BARCODES ===
                $variantsData = [];
                $variantEdges = $node['variants']['edges'] ?? [];
                if ($variantEdges instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                    $variantEdges = $variantEdges->toArray();
                }

                foreach ($variantEdges as $vEdge) {
                    $v = $vEdge['node'] ?? [];
                    if ($v instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                        $v = $v->toArray();
                    }

                    if (empty($v['id'])) continue;

                    $shopifyVariantId = intval(basename($v['id']));

                    // Selected options (Option 1, 2, 3)
                    $options = collect($v['selectedOptions'] ?? [])
                        ->pluck('value')
                        ->pad(3, null)
                        ->toArray();

                    // Variant image with fallback
                    $variantImage = null;
                    $variantImageAlt = null;

                    if (!empty($v['image'])) {
                        $img = $v['image'];
                        if ($img instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                            $img = $img->toArray();
                        }
                        $variantImage = $img['src'] ?? $img['originalSrc'] ?? null;
                        $variantImageAlt = $img['altText'] ?? null;
                    }

                    if (!$variantImage && !empty($productImages[0]['src'])) {
                        $variantImage = $productImages[0]['src'];
                        $variantImageAlt = $productImages[0]['alt'];
                    }

                    $variantsData[] = [
                        'product_id'          => $product->id,
                        'shopify_variant_id'  => $shopifyVariantId,
                        'title'               => $v['title'] ?? 'Default Title',
                        'sku'                 => $v['sku'] ?? '',
                        'price'               => (float) ($v['price'] ?? 0),
                        'inventory_quantity'  => (int) ($v['inventoryQuantity'] ?? 0),
                        'option1'             => $options[0] ?? null,
                        'option2'             => $options[1] ?? null,
                        'option3'             => $options[2] ?? null,
                        'image'               => $variantImage,
                        'image_alt'           => $variantImageAlt,
                        'updated_at'          => now(),
                        'created_at'          => now(),
                    ];
                }

                // === UPSERT VARIANTS + BARCODES IN BULK ===
                if (!empty($variantsData)) {
                    // 1. Upsert Variants
                    Variant::upsert(
                        $variantsData,
                        ['product_id', 'shopify_variant_id'],
                        [
                            'title',
                            'sku',
                            'price',
                            'inventory_quantity',
                            'option1',
                            'option2',
                            'option3',
                            'image',
                            'image_alt',
                            'updated_at'
                        ]
                    );

                    // Inside your variant loop, after upserting variants:

                    $barcodeInserts = array_map(function ($vData) {
                        return [
                            'variant_id'     => $vData['shopify_variant_id'],  // ← Shopify ID goes here
                            'product_id'     => $vData['product_id'],
                            'barcode_value'  => !empty($vData['sku'])
                                ? $vData['sku']
                                : 'AUTO-' . $vData['shopify_variant_id'],
                            'format'         => 'UPC',
                            'image_url'      => null,
                            'is_duplicate'   => false,
                            'created_at'     => now(),
                            'updated_at'     => now(),
                        ];
                    }, $variantsData);

                    Barcode::upsert(
                        $barcodeInserts,
                        ['variant_id'], // unique by Shopify variant ID
                        [
                            'product_id',
                            'barcode_value',
                            'format',
                            'image_url',
                            'is_duplicate',
                            'updated_at'
                        ]
                    );
                }
            } catch (\Throwable $e) {
                Log::error("Failed to save product {$shopifyId}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
                continue;
            }
        }

        Log::info("Successfully processed product page after cursor: {$this->afterCursor} for shop {$shop->myshopify_domain}");
    }
}
