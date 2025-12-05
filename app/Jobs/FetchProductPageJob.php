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

class FetchProductPageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [10, 30, 60, 120, 300];
    public $timeout = 180;

    protected $shopId;
    protected $afterCursor;

    public function __construct($shopId, $afterCursor = null)
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
                      cursor
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
                              barcode
                              price
                              inventoryQuantity
                              image {
                                src
                                altText
                              }
                              selectedOptions {
                                name
                                value
                              }
                            }
                          }
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }
                GRAPHQL,
                [
                    'first' => 250,
                    'after' => $this->afterCursor
                ]
            );
        } catch (\Exception $e) {
            Log::error("GraphQL failed in FetchProductPageJob: " . $e->getMessage());
            $this->fail($e);
            return;
        }

        $products = $response['body']['data']['products']['edges'] ?? [];
        if (empty($products)) {
            Log::info("No products returned for cursor: {$this->afterCursor}");
            return;
        }

        foreach ($products as $edge) {
            $node = $edge['node'] ?? [];

            if (empty($node['id'])) {
                Log::warning("Skipping product with no ID");
                continue;
            }

            $shopifyProductId = intval(basename($node['id']));

            try {
                // === SAFELY EXTRACT VALUES FROM ResponseAccess OBJECTS ===

                // Title
                $title = $this->toString($node['title'] ?? 'Untitled Product');

                // Body HTML
                $bodyHtml = $this->toString($node['bodyHtml'] ?? null);

                // Status
                $status = strtolower($this->toString($node['status'] ?? 'draft'));

                // Vendor
                $vendor = $this->toString($node['vendor'] ?? null);

                // Product Type
                $productType = $this->toString($node['productType'] ?? null);

                // === TAGS — THE FINAL BULLETPROOF FIX ===
                $rawTags = $node['tags'] ?? null;
                $tagsArray = [];

                if ($rawTags !== null) {
                    if (is_object($rawTags) && method_exists($rawTags, 'toArray')) {
                        $tagsArray = $rawTags->toArray();
                    } elseif (is_array($rawTags)) {
                        $tagsArray = $rawTags;
                    } elseif (is_string($rawTags)) {
                        $tagsArray = array_filter(array_map('trim', explode(',', $rawTags)));
                    }

                    $tagsArray = array_filter(array_map('trim', (array)$tagsArray));
                }

                $tagsString = !empty($tagsArray) ? implode(', ', $tagsArray) : null;

                // === PRODUCT IMAGES ===
                $productImages = [];
                $imagesEdges = $node['images']['edges'] ?? [];

                if (is_object($imagesEdges) && method_exists($imagesEdges, 'toArray')) {
                    $imagesEdges = $imagesEdges->toArray();
                }

                foreach ($imagesEdges as $imgEdge) {
                    $img = $imgEdge['node'] ?? $imgEdge ?? [];
                    $src = $this->toString($img['src'] ?? $img['originalSrc'] ?? null);
                    $alt = $this->toString($img['altText'] ?? null);

                    if ($src) {
                        $productImages[] = ['src' => $src, 'alt' => $alt];
                    }
                }

                // === SAVE PRODUCT ===
                $product = Product::updateOrCreate(
                    [
                        'shopify_id' => $shopifyProductId,
                        'user_id'    => $shop->id
                    ],
                    [
                        'title'            => $title,
                        'description_html' => $bodyHtml,
                        'status'           => $status,
                        'vendor'           => $vendor,
                        'product_type'     => $productType,
                        'tags'             => $tagsString,
                        'images'           => $productImages,
                        'updated_at'       => now(),
                    ]
                );

                // === VARIANTS ===
                $variantsData = [];
                $variantEdges = $node['variants']['edges'] ?? [];

                if (is_object($variantEdges) && method_exists($variantEdges, 'toArray')) {
                    $variantEdges = $variantEdges->toArray();
                }

                foreach ($variantEdges as $vEdge) {
                    $v = $vEdge['node'] ?? $vEdge ?? [];
                    if (empty($v['id'])) continue;

                    $shopifyVariantId = intval(basename($this->toString($v['id'])));

                    $options = [null, null, null];
                    $selectedOptions = $v['selectedOptions'] ?? [];
                    if (is_object($selectedOptions) && method_exists($selectedOptions, 'toArray')) {
                        $selectedOptions = $selectedOptions->toArray();
                    }

                    foreach ($selectedOptions as $opt) {
                        $name = strtolower($this->toString($opt['name'] ?? ''));
                        $value = $this->toString($opt['value'] ?? null);
                        if ($name === 'size' || str_contains($name, 'option1')) {
                            $options[0] = $value;
                        } elseif ($name === 'color' || str_contains($name, 'option2')) {
                            $options[1] = $value;
                        } else {
                            $options[2] = $value;
                        }
                    }

                    $variantImage = null;
                    $variantImageAlt = null;
                    if (!empty($v['image'])) {
                        $img = $v['image'];
                        $variantImage = $this->toString($img['src'] ?? $img['originalSrc'] ?? null);
                        $variantImageAlt = $this->toString($img['altText'] ?? null);
                    }
                    if (!$variantImage && !empty($productImages[0]['src'])) {
                        $variantImage = $productImages[0]['src'];
                        $variantImageAlt = $productImages[0]['alt'];
                    }

                    $variantsData[] = [
                        'product_id'         => $product->id,
                        'shopify_variant_id' => $shopifyVariantId,
                        'title'              => $this->toString($v['title'] ?? 'Default Title'),
                        'sku'                => $this->toString($v['sku'] ?? ''),
                        'barcode'            => $this->toString($v['barcode'] ?? ''),
                        'price'              => (float)($this->toString($v['price'] ?? 0)),
                        'inventory_quantity' => (int)($this->toString($v['inventoryQuantity'] ?? 0)),
                        'option1'            => $options[0],
                        'option2'            => $options[1],
                        'option3'            => $options[2],
                        'image'              => $variantImage,
                        'image_alt'          => $variantImageAlt,
                        'created_at'         => now(),
                        'updated_at'         => now(),
                    ];
                }

                if (!empty($variantsData)) {
                    Variant::upsert(
                        $variantsData,
                        ['product_id', 'shopify_variant_id'],
                        [
                            'title',
                            'sku',
                            'barcode',
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

                    $shopifyVariantIds = array_column($variantsData, 'shopify_variant_id');
                    $localVariantMap = Variant::whereIn('shopify_variant_id', $shopifyVariantIds)
                        ->pluck('id', 'shopify_variant_id')
                        ->toArray();

                    $barcodeInserts = [];
                    foreach ($variantsData as $vData) {
                        $localVariantId = $localVariantMap[$vData['shopify_variant_id']] ?? null;
                        if (!$localVariantId) continue;

                        $rawBarcode = trim($vData['barcode'] ?? $vData['sku'] ?? '');
                        $barcodeValue = $rawBarcode ?: 'AUTO-' . $vData['shopify_variant_id'];

                        $barcodeInserts[] = [
                            'variant_id'     => $localVariantId,
                            'product_id'     => $vData['product_id'],
                            'barcode_value'  => $barcodeValue,
                            'format'         => $this->detectBarcodeFormat($barcodeValue),
                            'image_url'      => null,
                            'is_duplicate'   => false,
                            'created_at'     => now(),
                            'updated_at'     => now(),
                        ];
                    }

                    if (!empty($barcodeInserts)) {
                        Barcode::upsert(
                            $barcodeInserts,
                            ['variant_id'],
                            ['product_id', 'barcode_value', 'format', 'image_url', 'is_duplicate', 'updated_at']
                        );
                    }
                }
            } catch (\Throwable $e) {
                Log::error("Failed to process product {$shopifyProductId}: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
                continue;
            }
        }

        Log::info("Successfully processed product page for shop: {$shop->myshopify_domain}, cursor: {$this->afterCursor}");
    }

    /**
     * Safely convert ResponseAccess or any value to string
     */
    private function toString($value): ?string
    {
        if ($value === null) return null;
        if (is_string($value)) return $value;
        if (is_object($value) && method_exists($value, '__toString')) return (string) $value;
        if (is_object($value) && method_exists($value, 'toArray')) return $this->toString($value[0] ?? $value);
        if (is_scalar($value)) return (string) $value;
        return null;
    }

    private function detectBarcodeFormat(string $barcode): string
    {
        $clean = preg_replace('/\D/', '', $barcode);
        return match (strlen($clean)) {
            8       => 'EAN8',
            12      => 'UPC-A',
            13      => 'EAN13',
            default => 'CODE128',
        };
    }
}
