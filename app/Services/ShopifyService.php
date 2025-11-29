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

        return true;
    }



    public function updateVariantBarcodes(int $localProductId, array $barcodeMap): bool
    {
        $product = Product::find($localProductId);

        if (!$product || !$product->shopify_id) {
            Log::error("[BARCODE-SYNC] Product not found", ['id' => $localProductId]);
            return false;
        }

        $variants = Variant::where('product_id', $product->id)
            ->whereIn('id', array_keys($barcodeMap))
            ->get();

        if ($variants->isEmpty()) return true;

        $bulkVariants = [];
        foreach ($variants as $variant) {
            if (empty($variant->shopify_variant_id)) continue;

            $newBarcode = $barcodeMap[$variant->id] ?? null;
            if ($newBarcode === null) continue;

            $bulkVariants[] = [
                'id' => $this->toGid($variant->shopify_variant_id, 'ProductVariant'),
                'inventoryItem' => [
                    'barcode' => $newBarcode   // THIS IS THE CORRECT FIELD
                ]
            ];

            // Update local DB
            $variant->barcode = $newBarcode;
            $variant->saveQuietly();
        }

        if (empty($bulkVariants)) return true;

        $mutation = <<<'GRAPHQL'
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      inventoryItem {
        barcode
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

        $errors = $response['data']['productVariantsBulkUpdate']['userErrors'] ?? [];
        if (!empty($errors)) {
            Log::error("[BARCODE-SYNC] Failed", [
                'product_id' => $localProductId,
                'errors' => $errors
            ]);
            return false;
        }

        Log::info("[BARCODE-SYNC] SUCCESS", [
            'product_id' => $localProductId,
            'count' => count($bulkVariants)
        ]);

        return true;
    }

    // Fallback: single variant update (used if bulk fails or for single items)
    public function updateSingleVariantBarcode($shopifyVariantId, string $barcode): bool
    {
        $endpoint = "admin/api/2025-10/variants/{$shopifyVariantId}.json";

        $response = $this->shop->api()->rest('PUT', $endpoint, [
            'variant' => [
                'id' => $shopifyVariantId,
                'barcode' => $barcode,
            ]
        ]);

        if (isset($response['errors'])) {
            Log::error("[BARCODE-SYNC] Single update failed", [
                'variant_id' => $shopifyVariantId,
                'errors' => $response['errors']
            ]);
            return false;
        }

        return true;
    }
}
