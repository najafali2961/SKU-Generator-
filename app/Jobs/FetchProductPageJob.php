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
use Illuminate\Support\Facades\DB;

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
                // === TAGS ===
                $rawTags = $node['tags'] ?? [];
                $tags = is_array($rawTags)
                    ? array_filter($rawTags)
                    : (is_string($rawTags) ? array_filter(array_map('trim', explode(',', $rawTags))) : []);

                // === PRODUCT IMAGES ===
                $productImages = [];
                foreach (($node['images']['edges'] ?? []) as $imgEdge) {
                    $img = $imgEdge['node'] ?? [];
                    $productImages[] = [
                        'src' => $img['src'] ?? $img['originalSrc'] ?? null,
                        'alt' => $img['altText'] ?? null,
                    ];
                }

                // === SAVE PRODUCT ===
                $product = Product::updateOrCreate(
                    [
                        'shopify_id' => $shopifyProductId,
                        'user_id'    => $shop->id
                    ],
                    [
                        'title'            => $node['title'] ?? 'Untitled Product',
                        'description_html' => $node['bodyHtml'] ?? null,
                        'status'           => strtolower($node['status'] ?? 'draft'),
                        'vendor'           => $node['vendor'] ?? null,
                        'product_type'     => $node['productType'] ?? null,
                        'tags'             => $tags,
                        'images'           => $productImages,
                        'updated_at'       => now(),
                    ]
                );

                // === VARIANTS ===
                $variantsData = [];
                $variantEdges = $node['variants']['edges'] ?? [];

                foreach ($variantEdges as $vEdge) {
                    $v = $vEdge['node'] ?? [];
                    if (empty($v['id'])) continue;

                    $shopifyVariantId = intval(basename($v['id']));

                    // Build option1, option2, option3 from selectedOptions
                    $options = [null, null, null];
                    foreach ($v['selectedOptions'] ?? [] as $opt) {
                        $name = strtolower($opt['name'] ?? '');
                        $value = $opt['value'] ?? null;
                        if ($name === 'size' || str_contains($name, 'option1')) {
                            $options[0] = $value;
                        } elseif ($name === 'color' || str_contains($name, 'option2')) {
                            $options[1] = $value;
                        } else {
                            $options[2] = $value;
                        }
                    }

                    // Variant image fallback
                    $variantImage = null;
                    $variantImageAlt = null;
                    if (!empty($v['image'])) {
                        $img = $v['image'];
                        $variantImage = $img['src'] ?? $img['originalSrc'] ?? null;
                        $variantImageAlt = $img['altText'] ?? null;
                    }
                    if (!$variantImage && !empty($productImages[0]['src'])) {
                        $variantImage = $productImages[0]['src'];
                        $variantImageAlt = $productImages[0]['alt'];
                    }

                    $variantsData[] = [
                        'product_id'         => $product->id,
                        'shopify_variant_id' => $shopifyVariantId,
                        'title'              => $v['title'] ?? 'Default Title',
                        'sku'                => $v['sku'] ?? '',
                        'barcode'            => $v['barcode'] ?? '', // Shopify native barcode field!
                        'price'              => (float) ($v['price'] ?? 0),
                        'inventory_quantity' => (int) ($v['inventoryQuantity'] ?? 0),
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
                    // 1. Upsert Variants
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

                    // 2. Get local variant IDs
                    $shopifyVariantIds = array_column($variantsData, 'shopify_variant_id');
                    $localVariantMap = Variant::whereIn('shopify_variant_id', $shopifyVariantIds)
                        ->pluck('id', 'shopify_variant_id')
                        ->toArray();

                    // 3. Prepare Barcodes (using Shopify barcode if exists, fallback to SKU)
                    $barcodeInserts = [];
                    foreach ($variantsData as $vData) {
                        $localVariantId = $localVariantMap[$vData['shopify_variant_id']] ?? null;
                        if (!$localVariantId) {
                            Log::warning("Missing local variant for Shopify ID: {$vData['shopify_variant_id']}");
                            continue;
                        }

                        $rawBarcode = trim($vData['barcode'] ?? $vData['sku'] ?? '');
                        $barcodeValue = $rawBarcode ?: 'AUTO-' . $vData['shopify_variant_id'];

                        $barcodeInserts[] = [
                            'variant_id'     => $localVariantId,           // Local DB ID (correct!)
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
     * Simple barcode format detection
     */
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
