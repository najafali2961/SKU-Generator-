<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Barcode;
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

    /**
     * ✅ REMOVED: getCollections() - Now use database instead
     * Use Collection model directly in controllers
     */

    /**
     * Push SKUs to Shopify for a product's variants.
     *
     * Like updateVariantBarcodes(), returns the LOCAL variant IDs Shopify
     * actually accepted (with throttle retry + per-variant fallback) so a
     * transient throttle or one orphaned variant ("does not exist") can't drop
     * the whole product or be silently reported as success.
     *
     * @param  array<int,string>  $skuMap  [localVariantId => sku]
     * @return int[]  local variant IDs confirmed synced
     */
    public function updateVariantSkus(int $localProductId, array $skuMap): array
    {
        $product = Product::find($localProductId);

        if (!$product || !$product->shopify_id) {
            Log::error("[SKU-UPDATE] Product not found or missing Shopify ID", ['id' => $localProductId]);
            return [];
        }

        $variants = Variant::where('product_id', $product->id)
            ->whereIn('id', array_keys($skuMap))
            ->get();

        if ($variants->isEmpty()) return [];

        $syncedIds = [];
        $bulkVariants = [];
        $gidToLocalId = [];

        foreach ($skuMap as $localVariantId => $newSku) {
            $variant = $variants->firstWhere('id', $localVariantId);
            if (!$variant) continue;

            if (empty($variant->shopify_variant_id)) {
                $syncedIds[] = $variant->id;
                continue;
            }

            $gid = $this->toGid($variant->shopify_variant_id, 'ProductVariant');
            $gidToLocalId[$gid] = $variant->id;
            $bulkVariants[] = [
                'id' => $gid,
                'inventoryItem' => ['sku' => (string) $newSku],
            ];
        }

        if (empty($bulkVariants)) {
            return $syncedIds;
        }

        $productGid = $this->toGid($product->shopify_id, 'Product');

        $confirmed = $this->bulkUpdateSkus($productGid, $bulkVariants, $gidToLocalId, $localProductId);

        if ($confirmed !== null) {
            return array_merge($syncedIds, $confirmed);
        }

        // Per-variant fallback so one bad/orphaned variant can't take its siblings down.
        foreach ($bulkVariants as $bv) {
            $single = $this->bulkUpdateSkus($productGid, [$bv], $gidToLocalId, $localProductId);
            if (!empty($single)) {
                $syncedIds = array_merge($syncedIds, $single);
            } else {
                Log::error("[SKU-UPDATE] Variant failed after per-variant fallback", [
                    'product_id' => $localProductId,
                    'variant_gid' => $bv['id'],
                ]);
            }
        }

        return $syncedIds;
    }

    /**
     * Run the SKU bulk mutation with throttle-aware retries.
     *
     * @return int[]|null  confirmed local variant IDs, or null on failure.
     */
    private function bulkUpdateSkus(string $productGid, array $bulkVariants, array $gidToLocalId, int $localProductId): ?array
    {
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

        $variables = ['productId' => $productGid, 'variants' => $bulkVariants];
        $maxAttempts = 4;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $this->graph($mutation, $variables);
            } catch (\Throwable $e) {
                if ($attempt < $maxAttempts) {
                    usleep($this->backoffMicros($attempt));
                    continue;
                }
                Log::error("[SKU-UPDATE] Exception", [
                    'product_id' => $localProductId,
                    'error' => $e->getMessage(),
                ]);
                return null;
            }

            $topErrors = $response['errors'] ?? [];
            if (!empty($topErrors)) {
                if ($this->isThrottled($topErrors) && $attempt < $maxAttempts) {
                    usleep($this->backoffMicros($attempt));
                    continue;
                }
                Log::error("[SKU-UPDATE] GraphQL errors", [
                    'product_id' => $localProductId,
                    'errors' => $topErrors,
                ]);
                return null;
            }

            $userErrors = $response['data']['productVariantsBulkUpdate']['userErrors'] ?? [];
            if (!empty($userErrors)) {
                Log::error("[SKU-UPDATE] Shopify user errors", [
                    'product_id' => $localProductId,
                    'errors' => $userErrors,
                ]);
                // Remove the local orphan if Shopify says this variant is gone.
                $this->reconcileOrphanFromErrors($userErrors, $bulkVariants, $gidToLocalId, $localProductId);
                return null;
            }

            $returned = $response['data']['productVariantsBulkUpdate']['productVariants'] ?? [];
            $confirmed = [];
            foreach ($returned as $rv) {
                $gid = $rv['id'] ?? null;
                if ($gid && isset($gidToLocalId[$gid])) {
                    $confirmed[] = $gidToLocalId[$gid];
                }
            }

            if (empty($confirmed)) {
                foreach ($bulkVariants as $bv) {
                    $id = $bv['id'] ?? null;
                    if ($id && isset($gidToLocalId[$id])) {
                        $confirmed[] = $gidToLocalId[$id];
                    }
                }
            }

            return $confirmed;
        }

        return null;
    }

    /**
     * Push barcodes to Shopify for a product's variants.
     *
     * Returns the list of LOCAL variant IDs that Shopify actually accepted, so
     * callers persist/count only what truly synced. Previously this returned a
     * single bool: a transient throttle or one deleted variant made it return
     * false for the whole product, leaving every variant unchanged while the job
     * still reported success — which is why some barcodes stayed "missing".
     *
     * @param  array<int,string>  $barcodeMap  [localVariantId => barcode]
     * @return int[]  local variant IDs confirmed synced
     */
    public function updateVariantBarcodes(int $localProductId, array $barcodeMap): array
    {
        $product = Product::find($localProductId);

        if (!$product || !$product->shopify_id) {
            Log::error("[BARCODE-SYNC] Product not found", ['id' => $localProductId]);
            return [];
        }

        $variants = Variant::where('product_id', $product->id)
            ->whereIn('id', array_keys($barcodeMap))
            ->get();

        if ($variants->isEmpty()) return [];

        $syncedIds = [];     // local IDs we consider handled
        $bulkVariants = [];  // payload for Shopify
        $gidToLocalId = [];  // map Shopify GID -> local variant id

        foreach ($variants as $variant) {
            if (empty($variant->shopify_variant_id)) {
                // Nothing to push to Shopify (no remote variant); treat as handled
                // so it still gets a local barcode instead of being stuck missing.
                $syncedIds[] = $variant->id;
                continue;
            }

            $newBarcode = $barcodeMap[$variant->id] ?? null;
            if ($newBarcode === null) continue;

            $gid = $this->toGid($variant->shopify_variant_id, 'ProductVariant');
            $gidToLocalId[$gid] = $variant->id;
            $bulkVariants[] = [
                'id' => $gid,
                'barcode' => (string) $newBarcode, // ✅ ENSURE STRING TYPE
            ];
        }

        if (empty($bulkVariants)) {
            return $syncedIds;
        }

        $productGid = $this->toGid($product->shopify_id, 'Product');

        // Try the whole product at once (cheapest). null => the call failed
        // outright (throttle/exception/top-level errors after retries).
        $confirmed = $this->bulkUpdateBarcodes($productGid, $bulkVariants, $gidToLocalId, $localProductId);

        if ($confirmed !== null) {
            return array_merge($syncedIds, $confirmed);
        }

        // Fallback: retry each variant on its own so one bad/deleted variant
        // cannot take its siblings down with it.
        foreach ($bulkVariants as $bv) {
            $single = $this->bulkUpdateBarcodes($productGid, [$bv], $gidToLocalId, $localProductId);
            if (!empty($single)) {
                $syncedIds = array_merge($syncedIds, $single);
            } else {
                Log::error("[BARCODE-SYNC] Variant failed after per-variant fallback", [
                    'product_id' => $localProductId,
                    'variant_gid' => $bv['id'],
                ]);
            }
        }

        return $syncedIds;
    }

    /**
     * Run the productVariantsBulkUpdate mutation with throttle-aware retries.
     *
     * @return int[]|null  confirmed local variant IDs, or null if the call
     *                     failed (so the caller can fall back to per-variant).
     */
    private function bulkUpdateBarcodes(string $productGid, array $bulkVariants, array $gidToLocalId, int $localProductId): ?array
    {
        $mutation = <<<'GRAPHQL'
mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      barcode
    }
    userErrors {
      field
      message
    }
  }
}
GRAPHQL;

        $variables = ['productId' => $productGid, 'variants' => $bulkVariants];
        $maxAttempts = 4;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $response = $this->graph($mutation, $variables);
            } catch (\Throwable $e) {
                // Network / 5xx / 429 surfaced as an exception. Retry a few times.
                if ($attempt < $maxAttempts) {
                    usleep($this->backoffMicros($attempt));
                    continue;
                }
                Log::error("[BARCODE-SYNC] Exception", [
                    'product_id' => $localProductId,
                    'error' => $e->getMessage(),
                ]);
                return null;
            }

            // Top-level GraphQL errors (e.g. THROTTLED) live here, NOT in userErrors.
            // The old code only checked userErrors, so it silently treated a
            // throttled response as success.
            $topErrors = $response['errors'] ?? [];
            if (!empty($topErrors)) {
                if ($this->isThrottled($topErrors) && $attempt < $maxAttempts) {
                    usleep($this->backoffMicros($attempt));
                    continue;
                }
                Log::error("[BARCODE-SYNC] GraphQL errors", [
                    'product_id' => $localProductId,
                    'errors' => $topErrors,
                ]);
                return null;
            }

            $userErrors = $response['data']['productVariantsBulkUpdate']['userErrors'] ?? [];
            if (!empty($userErrors)) {
                Log::error("[BARCODE-SYNC] Shopify userErrors", [
                    'product_id' => $localProductId,
                    'errors' => $userErrors,
                ]);
                // If this single-variant call failed because the variant was
                // deleted on Shopify, remove the local orphan so it stops
                // haunting the "Missing" tab forever.
                $this->reconcileOrphanFromErrors($userErrors, $bulkVariants, $gidToLocalId, $localProductId);
                return null; // let caller retry per-variant
            }

            // Confirm exactly which variants Shopify echoed back.
            $returned = $response['data']['productVariantsBulkUpdate']['productVariants'] ?? [];
            $confirmed = [];
            foreach ($returned as $rv) {
                $gid = $rv['id'] ?? null;
                if ($gid && isset($gidToLocalId[$gid])) {
                    $confirmed[] = $gidToLocalId[$gid];
                }
            }

            // If Shopify accepted the mutation but returned no identifiable
            // variants, fall back to "everything we submitted" rather than
            // dropping them.
            if (empty($confirmed)) {
                foreach ($bulkVariants as $bv) {
                    $id = $bv['id'] ?? null;
                    if ($id && isset($gidToLocalId[$id])) {
                        $confirmed[] = $gidToLocalId[$id];
                    }
                }
            }

            return $confirmed;
        }

        return null;
    }

    private function isThrottled(array $errors): bool
    {
        foreach ($errors as $err) {
            $code = $err['extensions']['code'] ?? null;
            if ($code === 'THROTTLED') return true;
            if (isset($err['message']) && stripos($err['message'], 'throttle') !== false) return true;
        }
        return false;
    }

    private function backoffMicros(int $attempt): int
    {
        // 0.5s, 1s, 2s, capped at 2s.
        return (int) min(2_000_000, 500_000 * (2 ** ($attempt - 1)));
    }

    /**
     * When a SINGLE-variant update fails because the variant no longer exists
     * on Shopify, delete the stale local row (and its barcode) so it can't sit
     * in the "Missing" tab forever. Only acts on single-variant calls so the
     * error unambiguously refers to that one variant.
     */
    private function reconcileOrphanFromErrors(array $userErrors, array $bulkVariants, array $gidToLocalId, int $localProductId): void
    {
        if (count($bulkVariants) !== 1) return;
        if (!$this->looksLikeMissingVariant($userErrors)) return;

        $gid = $bulkVariants[0]['id'] ?? null;
        if (!$gid) return;

        $localId = $gidToLocalId[$gid] ?? null;
        if (!$localId) return;

        // gid://shopify/ProductVariant/123 -> 123 (matches barcodes.variant_id).
        $parts = explode('/', (string) $gid);
        $shopifyVariantId = (int) end($parts);

        try {
            Variant::where('id', $localId)->delete();
            if ($shopifyVariantId) {
                Barcode::where('variant_id', $shopifyVariantId)->delete();
            }
            Log::warning("[SYNC] Removed orphaned variant deleted on Shopify", [
                'variant_id' => $localId,
                'shopify_variant_id' => $shopifyVariantId,
                'product_id' => $localProductId,
            ]);
        } catch (\Throwable $e) {
            Log::error("[SYNC] Failed to remove orphaned variant", [
                'variant_id' => $localId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function looksLikeMissingVariant(array $userErrors): bool
    {
        foreach ($userErrors as $err) {
            $msg = strtolower((string) ($err['message'] ?? ''));
            if (str_contains($msg, 'does not exist') || str_contains($msg, "doesn't exist")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Fallback: single variant update (used if bulk fails or for single items)
     */
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
