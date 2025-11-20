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
            $pageInfo = $response['body']['data']['products']['pageInfo'];

            foreach ($products as $edge) {
                $node = $edge['node'];

                // FIX: Convert GID → numeric
                $shopifyId = intval(basename($node['id']));

                // FIX: Convert ResponseAccess → arrays
                $imageEdges = json_decode(json_encode($node['images']['edges'] ?? []), true);
                $variantEdges = json_decode(json_encode($node['variants']['edges'] ?? []), true);

                // Images
                $images = array_map(
                    fn($img) => [
                        'src' => $img['node']['src'] ?? null,
                        'alt' => $img['node']['altText'] ?? null
                    ],
                    $imageEdges
                );

                // Tags
                $tags = is_string($node['tags'])
                    ? array_filter(array_map('trim', explode(',', $node['tags'])))
                    : (array)$node['tags'];

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

                // CLEAR old variants
                Variant::where('product_id', $product->id)->delete();

                // Save variants
                foreach ($variantEdges as $vEdge) {
                    $v = $vEdge['node'];

                    Variant::create([
                        'product_id' => $product->id,
                        'shopify_variant_id' => intval(basename($v['id'])),
                        'title' => $v['title'] ?? '',
                        'sku' => $v['sku'] ?? '',
                        'price' => $v['price'] ?? 0,
                        'inventory_quantity' => $v['inventoryQuantity'] ?? 0,
                        'option1' => $v['selectedOptions'][0]['value'] ?? null,
                        'option2' => $v['selectedOptions'][1]['value'] ?? null,
                        'option3' => $v['selectedOptions'][2]['value'] ?? null,
                    ]);
                }
            }

            $after = $pageInfo['hasNextPage'] ? $pageInfo['endCursor'] : null;
        } while ($after);

        Log::info("🎉 Completed product + variant sync for install: {$shop->myshopify_domain}");
    }
}
