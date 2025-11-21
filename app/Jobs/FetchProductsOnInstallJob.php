<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Variant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class FetchProductsOnInstallJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;

    public function __construct($shop)
    {
        $this->shopId = $shop->id ?? $shop;
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);
        if (!$shop) {
            Log::error("❌ Shop not found: {$this->shopId}");
            return;
        }

        $limit = 50;
        $after = null;

        do {
            $query = <<<'GRAPHQL'
query getProducts($first: Int!, $after: String) {
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

        images(first: 10) {
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
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
GRAPHQL;

            try {
                $response = $shop->api()->graph($query, [
                    'first' => $limit,
                    'after' => $after
                ]);
            } catch (\Exception $e) {
                Log::error("❌ GraphQL failed: " . $e->getMessage());
                break;
            }

            $products = $response['body']['data']['products']['edges'] ?? [];
            $pageInfo = $response['body']['data']['products']['pageInfo'] ?? null;

            foreach ($products as $edge) {
                $node = $edge['node'];

                $shopifyId = intval(basename($node['id']));

                // SAFE images
                $images = [];
                $imageEdges = $node['images']['edges'] ?? [];
                if (is_array($imageEdges)) {
                    foreach ($imageEdges as $img) {
                        if (!isset($img['node'])) continue;
                        $images[] = [
                            'src' => $img['node']['src'] ?? null,
                            'alt' => $img['node']['altText'] ?? null,
                        ];
                    }
                }

                // SAFE tags
                $tags = [];
                if (isset($node['tags'])) {
                    if (is_string($node['tags'])) {
                        $tags = array_filter(array_map('trim', explode(',', $node['tags'])));
                    } elseif (is_array($node['tags'])) {
                        $tags = $node['tags'];
                    }
                }

                // Save product
                $product = Product::updateOrCreate(
                    ['shopify_id' => $shopifyId, 'user_id' => $shop->id],
                    [
                        'title' => $node['title'],
                        'description_html' => $node['bodyHtml'],
                        'status' => $node['status'],
                        'vendor' => $node['vendor'],
                        'product_type' => $node['productType'],
                        'tags' => $tags,
                        'images' => $images,
                    ]
                );

                // Delete old variants
                Variant::where('product_id', $product->id)->delete();

                // Variants
                $variantEdges = $node['variants']['edges'] ?? [];

                foreach ($variantEdges as $vEdge) {
                    $v = $vEdge['node'];
                    $options = $v['selectedOptions'] ?? [];

                    Variant::create([
                        'product_id' => $product->id,
                        'shopify_variant_id' => intval(basename($v['id'])),
                        'title' => $v['title'] ?? '',
                        'sku' => $v['sku'] ?? '',
                        'price' => $v['price'] ?? 0,
                        'inventory_quantity' => $v['inventoryQuantity'] ?? 0,
                        'option1' => $options[0]['value'] ?? null,
                        'option2' => $options[1]['value'] ?? null,
                        'option3' => $options[2]['value'] ?? null,
                    ]);
                }
            }

            $after = $pageInfo && $pageInfo['hasNextPage'] ? $pageInfo['endCursor'] : null;
        } while ($after);

        Log::info("🎉 Completed product + variant sync for install: {$shop->myshopify_domain}");
    }
}
