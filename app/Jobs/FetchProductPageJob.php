<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Variant;
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
        if (!$shop) return;

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
            Log::error("GraphQL failed in page job: " . $e->getMessage());
            $this->fail($e);
            return;
        }

        $edges = $response['body']['data']['products']['edges'] ?? [];
        if (empty($edges)) {
            Log::warning("No products returned for cursor: {$this->afterCursor}");
            return;
        }

        foreach ($edges as $edge) {
            $node = $edge['node'] ?? [];

            // Skip invalid nodes
            if (empty($node['id'])) {
                Log::warning("Skipping product with no ID");
                continue;
            }

            try {
                $shopifyId = intval(basename($node['id'] ?? ''));

                // === SAFE TAGS ===
                $rawTags = $node['tags'] ?? [];
                if ($rawTags instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                    $rawTags = $rawTags->toArray();
                }
                $tags = is_array($rawTags)
                    ? array_filter($rawTags)
                    : (is_string($rawTags) ? array_filter(array_map('trim', explode(',', $rawTags))) : []);

                // === SAFE IMAGES ===
                $images = [];
                $imageEdges = $node['images']['edges'] ?? [];
                if ($imageEdges instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                    $imageEdges = $imageEdges->toArray();
                }
                foreach ($imageEdges as $img) {
                    $imgNode = $img['node'] ?? [];
                    if ($imgNode instanceof \Gnikyt\BasicShopifyAPI\ResponseAccess) {
                        $imgNode = $imgNode->toArray();
                    }
                    $images[] = [
                        'src' => $imgNode['src'] ?? $imgNode['originalSrc'] ?? null,
                        'alt' => $imgNode['altText'] ?? null,
                    ];
                }

                // === SAVE PRODUCT ===
                $product = Product::updateOrCreate(
                    ['shopify_id' => $shopifyId, 'user_id' => $shop->id],
                    [
                        'title' => $node['title'] ?? 'Untitled Product',
                        'description_html' => $node['bodyHtml'] ?? null,
                        'status' => $node['status'] ?? 'draft',
                        'vendor' => $node['vendor'] ?? null,
                        'product_type' => $node['productType'] ?? null,
                        'tags' => $tags,
                        'images' => $images,
                        'updated_at' => now(),
                    ]
                );

                // === SAFE VARIANTS ===
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

                    $options = collect($v['selectedOptions'] ?? [])
                        ->pluck('value')
                        ->pad(3, null)
                        ->toArray();

                    $variantsData[] = [
                        'product_id' => $product->id,
                        'shopify_variant_id' => intval(basename($v['id'])),
                        'title' => $v['title'] ?? 'Default Title',
                        'sku' => $v['sku'] ?? '',
                        'price' => (float) ($v['price'] ?? 0),
                        'inventory_quantity' => (int) ($v['inventoryQuantity'] ?? 0),
                        'option1' => $options[0] ?? null,
                        'option2' => $options[1] ?? null,
                        'option3' => $options[2] ?? null,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ];
                }

                if (!empty($variantsData)) {
                    Variant::upsert(
                        $variantsData,
                        ['product_id', 'shopify_variant_id'],
                        ['title', 'sku', 'price', 'inventory_quantity', 'option1', 'option2', 'option3', 'updated_at']
                    );
                }
            } catch (\Throwable $e) {
                // NEVER let one bad product kill the entire page
                Log::error("Failed to save product {$shopifyId}: " . $e->getMessage());
                continue;
            }
        }

        Log::info("Successfully processed page after cursor: {$this->afterCursor}");
    }
}
