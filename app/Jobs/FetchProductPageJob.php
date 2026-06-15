<?php

namespace App\Jobs;

use App\Models\Product;
use App\Models\Variant;
use App\Models\Collection;
use App\Models\Barcode;
use App\Models\JobLog;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class FetchProductPageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [10, 30, 60, 120, 300];
    public $timeout = 180;

    protected $shopId;
    protected $afterCursor;

    /**
     * When true this page is part of a manual re-sync: it tracks progress in
     * Redis, prunes variants deleted on Shopify, and self-chains to the next
     * page. When false (install flow) behaviour is unchanged — the install
     * coordinator drives pagination itself.
     */
    protected $isResync;

    /** JobLog row id mirrored for the admin Bulk Jobs panel (re-sync only). */
    protected $jobLogId;

    public function __construct($shopId, $afterCursor = null, $isResync = false, $jobLogId = null)
    {
        $this->shopId = $shopId;
        $this->afterCursor = $afterCursor;
        $this->isResync = $isResync;
        $this->jobLogId = $jobLogId;
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
                        handle
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
                        collections(first: 100) {
                          edges {
                            node {
                              id
                              title
                              handle
                              description
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
            if ($this->isResync) {
                // Let the queue retry transient Shopify errors (tries + backoff)
                // before giving up; failed() marks the sync failed if exhausted.
                throw $e;
            }
            $this->fail($e);
            return;
        }

        $products = $response['body']['data']['products']['edges'] ?? [];
        $pageInfo = $response['body']['data']['products']['pageInfo'] ?? null;
        if (empty($products)) {
            if ($this->isResync) {
                $this->markSyncCompleted();
            }
            return;
        }

        foreach ($products as $edge) {
            $node = $edge['node'] ?? [];

            if (empty($node['id'])) {
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

                // === TAGS — BULLETPROOF FIX ===
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
                        'handle'           => $this->toString($node['handle'] ?? null),
                        'description_html' => $bodyHtml,
                        'status'           => $status,
                        'vendor'           => $vendor,
                        'product_type'     => $productType,
                        'tags'             => $tagsString,
                        'images'           => $productImages,
                        'updated_at'       => now(),
                    ]
                );

                // === HANDLE COLLECTIONS ===
                $this->syncCollections($product, $shop, $node['collections'] ?? []);

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

                    // On a re-sync, prune local variants that no longer exist on
                    // Shopify (deleted remotely while a webhook was missed) so
                    // they stop sitting forever in the "Missing" tab. Guard: we
                    // fetch variants(first:100); if a product has 100+ variants
                    // the list may be truncated, so skip pruning to be safe.
                    if ($this->isResync) {
                        $incomingShopifyVariantIds = array_column($variantsData, 'shopify_variant_id');
                        if (!empty($incomingShopifyVariantIds) && count($incomingShopifyVariantIds) < 100) {
                            $orphans = Variant::where('product_id', $product->id)
                                ->whereNotIn('shopify_variant_id', $incomingShopifyVariantIds)
                                ->get(['id', 'shopify_variant_id']);

                            if ($orphans->isNotEmpty()) {
                                $orphanLocalIds   = $orphans->pluck('id')->all();
                                $orphanShopifyIds = $orphans->pluck('shopify_variant_id')->filter()->all();

                                Variant::whereIn('id', $orphanLocalIds)->delete();
                                // barcodes.variant_id is the local id here but the
                                // shopify id in the webhook job — clear both.
                                Barcode::where('product_id', $product->id)
                                    ->whereIn('variant_id', array_merge($orphanLocalIds, $orphanShopifyIds))
                                    ->delete();

                                Log::warning('[RESYNC] Pruned variants deleted on Shopify', [
                                    'product_id' => $product->id,
                                    'count' => count($orphanLocalIds),
                                ]);
                            }
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::error("Failed to process product {$shopifyProductId}: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
                continue;
            }
        }

        // Re-sync only: advance progress and hand off to the next page.
        if ($this->isResync) {
            $count = count($products);
            if ($count > 0) {
                Redis::incrby("product_sync:{$this->shopId}:processed", $count);
            }
            Redis::expire("product_sync:{$this->shopId}:processed", 86400);
            // Keep the running flag alive while the chain makes progress.
            Redis::setex("product_sync:{$this->shopId}:status", 3600, 'running');

            // Mirror progress into the admin JobLog (cheap keyed update).
            if ($this->jobLogId) {
                $processed = (int) Redis::get("product_sync:{$this->shopId}:processed");
                $total     = (int) Redis::get("product_sync:{$this->shopId}:total");
                JobLog::whereKey($this->jobLogId)->update([
                    'status'          => 'running',
                    'processed_items' => $processed,
                    'total_items'     => $total,
                ]);
            }

            $hasNext   = $pageInfo['hasNextPage'] ?? false;
            $endCursor = $pageInfo['endCursor'] ?? null;

            if ($hasNext && $endCursor) {
                // Small delay keeps us comfortably under Shopify's GraphQL rate limit.
                self::dispatch($this->shopId, $endCursor, true, $this->jobLogId)->delay(now()->addSecond());
            } else {
                $this->markSyncCompleted();
            }
        }
    }

    private function markSyncCompleted(): void
    {
        Redis::setex("product_sync:{$this->shopId}:status", 86400, 'completed');
        Redis::setex("product_sync:{$this->shopId}:finished_at", 86400, now()->toIso8601String());

        if ($this->jobLogId && ($log = JobLog::find($this->jobLogId))) {
            $total = (int) Redis::get("product_sync:{$this->shopId}:total");
            $processed = (int) Redis::get("product_sync:{$this->shopId}:processed");
            $log->update([
                'status'          => 'completed',
                'processed_items' => $processed,
                'total_items'     => $total ?: $processed,
                'finished_at'     => now(),
            ]);
            // Direct activity log (no completion email for an internal sync).
            $log->success('Sync completed', 'Products & variants re-pulled from Shopify');
        }
    }

    public function failed(\Throwable $e): void
    {
        if ($this->isResync) {
            Redis::setex("product_sync:{$this->shopId}:status", 86400, 'failed');
            Redis::setex("product_sync:{$this->shopId}:finished_at", 86400, now()->toIso8601String());

            if ($this->jobLogId && ($log = JobLog::find($this->jobLogId))) {
                $log->update([
                    'status'        => 'failed',
                    'error_message' => $e->getMessage(),
                    'finished_at'   => now(),
                ]);
                $log->error('Sync failed', $e->getMessage());
            }
        }
    }

    /**
     * ✅ SYNC COLLECTIONS FOR A PRODUCT
     */
    private function syncCollections(Product $product, User $shop, $collectionsData): void
    {
        try {
            // Parse collections data
            $collectionsEdges = $collectionsData['edges'] ?? [];
            if (is_object($collectionsEdges) && method_exists($collectionsEdges, 'toArray')) {
                $collectionsEdges = $collectionsEdges->toArray();
            }

            $collectionIds = [];

            foreach ($collectionsEdges as $cEdge) {
                $c = $cEdge['node'] ?? $cEdge ?? [];
                if (empty($c['id'])) continue;

                $shopifyCollectionId = intval(basename($this->toString($c['id'])));

                // Create or update collection
                $collection = Collection::updateOrCreate(
                    [
                        'shopify_id' => $shopifyCollectionId,
                        'user_id'    => $shop->id
                    ],
                    [
                        'title'       => $this->toString($c['title'] ?? 'Untitled Collection'),
                        'handle'      => $this->toString($c['handle'] ?? null),
                        'description' => $this->toString($c['description'] ?? null),
                    ]
                );

                $collectionIds[] = $collection->id;
            }

            // Sync collections with product (this will update pivot table)
            $product->collections()->sync($collectionIds);
        } catch (\Throwable $e) {
            Log::error("Failed to sync collections for product {$product->id}: " . $e->getMessage());
            // Don't fail the whole job, just log and continue
        }
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
