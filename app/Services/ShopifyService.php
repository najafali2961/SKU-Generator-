<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Log;

class ShopifyService
{
    protected $shop;

    public function __construct($shop)
    {
        $this->shop = $shop;
    }

    public function graph(string $query, array $variables = []): array
    {
        Log::info('[ShopifyService] GraphQL request', [
            'shop' => $this->shop->name ?? 'unknown',
            'query_preview' => substr(preg_replace('/\s+/', ' ', $query), 0, 250),
            'variables' => $variables,
        ]);

        try {
            $response = $this->shop->api()->graph($query, $variables);

            $body = $response['body'] ?? $response;

            if (is_object($body)) {
                if (method_exists($body, 'toArray')) {
                    $body = $body->toArray();
                } elseif (method_exists($body, 'jsonSerialize')) {
                    $body = $body->jsonSerialize();
                } else {
                    $body = (array) $body;
                }
            }

            if (!is_array($body)) {
                $body = (array) $response;
            }

            return $body;
        } catch (\Throwable $e) {
            Log::error('[ShopifyService] GraphQL exception', [
                'shop' => $this->shop->name ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => substr($e->getTraceAsString(), 0, 800),
            ]);

            throw $e;
        }
    }

    protected function toGid($id, string $type)
    {
        return str_starts_with($id, 'gid://') ? $id : "gid://shopify/{$type}/{$id}";
    }

    public function updateProduct($shopifyId, array $fields): bool
    {
        $shopifyId = $this->toGid($shopifyId, 'Product');
        $allowed = ['title', 'description_html', 'status', 'vendor', 'tags'];
        $input = ['id' => $shopifyId];

        foreach ($fields as $key => $val) {
            if (!in_array($key, $allowed)) continue;
            if ($key === 'description_html') $key = 'descriptionHtml';
            if ($key === 'tags' && is_array($val)) $val = array_values($val);
            $input[$key] = $val;
        }

        $mutation = <<<'GRAPHQL'
mutation productUpdate($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id title vendor status }
    userErrors { field message }
  }
}
GRAPHQL;

        $resp = $this->graph($mutation, ['input' => $input]);
        $errors = $resp['data']['productUpdate']['userErrors'] ?? [];

        if (!empty($errors)) {
            Log::error("[PRODUCT-UPDATE] Shopify Errors", ['productId' => $shopifyId, 'errors' => $errors]);
            return false;
        }

        Log::info("[PRODUCT-UPDATE] OK", ['productId' => $shopifyId]);
        return true;
    }

    public function getCollections()
    {
        $list = [];
        try {
            $c = $this->shop->api()->rest('GET', '/admin/api/2025-10/custom_collections.json');
            foreach ($c['body']['custom_collections'] ?? [] as $col) $list[] = ['id' => $col['id'], 'title' => $col['title']];
            $s = $this->shop->api()->rest('GET', '/admin/api/2025-10/smart_collections.json');
            foreach ($s['body']['smart_collections'] ?? [] as $col) $list[] = ['id' => $col['id'], 'title' => $col['title']];
        } catch (\Exception $e) {
            Log::error("Failed to fetch collections: {$e->getMessage()}");
        }
        return $list;
    }

    public function getProductIdsByCollections(array $collectionIds)
    {
        $result = [];
        try {
            foreach ($collectionIds as $id) {
                $endpoint = "/admin/api/2025-10/collections/{$id}/products.json";
                $params = ['limit' => 250];
                do {
                    $res = $this->shop->api()->rest('GET', $endpoint, $params);
                    foreach ($res['body']['products'] ?? [] as $p) $result[$p['id']] = $id;
                    $next = $res['link']['next'] ?? null;
                    if ($next) {
                        $endpoint = $next['url'];
                        $params = [];
                    } else {
                        $endpoint = null;
                    }
                } while ($endpoint);
            }
        } catch (\Exception $e) {
            Log::error("Failed fetching products: {$e->getMessage()}");
        }
        return $result;
    }

    public function updateVariantSkus(int $localProductId, array $skuMap): bool
    {
        // Fetch the product
        $product = Product::find($localProductId);

        if (!$product || !$product->shopify_id) {
            Log::error("[SKU-UPDATE] Product not found or missing Shopify ID", ['id' => $localProductId]);
            return false;
        }

        // Fetch variants manually from Variant model
        $variants = Variant::where('product_id', $product->id)->get();

        if ($variants->isEmpty()) {
            Log::warning("[SKU-UPDATE] No variants found for product", ['product_id' => $localProductId]);
            return false;
        }

        $bulkVariants = [];
        foreach ($skuMap as $localVariantId => $newSku) {
            $variant = $variants->firstWhere('id', $localVariantId);

            if (!$variant || !$variant->shopify_variant_id) {
                Log::warning("[SKU-UPDATE] Variant not found or missing Shopify ID", ['local_id' => $localVariantId]);
                continue;
            }

            $bulkVariants[] = [
                'id' => $this->toGid($variant->shopify_variant_id, 'ProductVariant'),
                'inventoryItem' => ['sku' => $newSku]
            ];

            // Update local DB immediately
            $variant->sku = $newSku;
            $variant->save();
        }

        if (empty($bulkVariants)) {
            Log::warning("[SKU-UPDATE] No valid variants to update for product", ['product_id' => $localProductId]);
            return false;
        }

        // Shopify Bulk Update Mutation
        $mutation = <<<'GRAPHQL'
mutation BulkUpdateVariantSKUs($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      inventoryItem {
        sku
      }
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL;

        $variables = [
            'productId' => $this->toGid($product->shopify_id, 'Product'),
            'variants' => $bulkVariants,
        ];

        $response = $this->graph($mutation, $variables);

        $userErrors = $response['data']['productVariantsBulkUpdate']['userErrors'] ?? [];
        if (!empty($userErrors)) {
            Log::error("[SKU-UPDATE] Shopify user errors", [
                'product_id' => $localProductId,
                'errors' => $userErrors
            ]);
            return false;
        }

        Log::info("[SKU-UPDATE] Bulk update successful", [
            'product_id' => $localProductId,
            'updated_variants' => count($bulkVariants)
        ]);

        return true;
    }
}
