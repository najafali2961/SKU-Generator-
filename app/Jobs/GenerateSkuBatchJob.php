<?php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\User;
use App\Models\JobLog;
use App\Services\ShopifyService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateSkuBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;

    public $timeout = 1800; // Increased to 30 minutes to prevent timeout on large batches

    public $shopId;
    public $variantIds;
    public $settings;
    public $jobLogId;

    public $startCounter;

    public function __construct($shopId, $settings, array $variantIds, $startCounter, $jobLogId = null)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
        $this->variantIds = $variantIds;
        $this->startCounter = $startCounter;
        $this->jobLogId = $jobLogId;
        $this->onQueue('default');
    }

    public function handle()
    {
        // No logs.
        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $shop = User::find($this->shopId);
        if (!$shop) return;

        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')
            ->whereIn('id', $this->variantIds)
            ->get();

        if ($variants->isEmpty()) return;

        $processed = 0;
        $failed = 0;

        // Use pre-allocated counter
        $currentCounter = $this->startCounter;
        
        // Track per-product initialization offset for "restart_per_product" support
        $perProductCounters = [];
        $startNumber = (int)($this->settings['auto_start'] ?? 1);

        if (!empty($this->settings['restart_per_product'])) {
            $productIds = $variants->pluck('product_id')->unique()->toArray();
            $firstVariantIdInBatch = collect($this->variantIds)->min(); // The IDs in this chunk

            // We must find how many variants mapped to these products existed BEFORE this batch
            // The job query is usually based on shop variants.
            $priorCountsQuery = Variant::whereIn('product_id', $productIds)
                ->where('id', '<', $firstVariantIdInBatch);

            // Apply the scope logic constraints that GenerateSkuJob uses
            $tab = $this->settings['active_tab'] ?? 'all';
            if ($tab === 'missing') {
                $priorCountsQuery->where(function($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                });
            } elseif ($tab === 'duplicates') {
                $dupSkus = Variant::whereHas('product', fn($q) => $q->where('user_id', $this->shopId))
                    ->select('sku')
                    ->whereNotNull('sku')
                    ->where('sku', '<>', '')
                    ->groupBy('sku')
                    ->havingRaw('count(*) > 1');
                $priorCountsQuery->whereIn('sku', $dupSkus);
            }
            if (!empty($this->settings['only_missing'])) {
                $priorCountsQuery->whereNull('sku');
            }
            if (!empty($this->settings['vendor'])) {
                $priorCountsQuery->whereHas('product', fn($p) => $p->where('vendor', $this->settings['vendor']));
            }
            if (!empty($this->settings['type'])) {
                $priorCountsQuery->whereHas('product', fn($p) => $p->where('product_type', $this->settings['type']));
            }
            if (!empty($this->settings['search'])) {
                $term = trim($this->settings['search']);
                $priorCountsQuery->where(function ($q) use ($term) {
                    $q->where('sku', 'like', "%{$term}%")
                      ->orWhere('title', 'like', "%{$term}%")
                      ->orWhereHas('product', function ($pq) use ($term) {
                          $pq->where('title', 'like', "%{$term}%");
                      });
                });
            }

            $counts = $priorCountsQuery->select(\Illuminate\Support\Facades\DB::raw('product_id, count(*) as cnt'))
                ->groupBy('product_id')
                ->pluck('cnt', 'product_id');

            foreach ($productIds as $pId) {
                $perProductCounters[$pId] = $startNumber + ($counts->get($pId, 0));
            }
        }

        // Use Redis for high-speed progress tracking to avoid DB row locks
        $redisKeyProcessed = "job_progress_{$this->jobLogId}";
        $redisKeyFailed    = "job_failed_{$this->jobLogId}";

        foreach ($variants->groupBy('product_id') as $productId => $productVariants) {
            $skuMap = [];
            $batchProcessed = 0;

            foreach ($productVariants as $variant) {
                try {
                    $number = !empty($this->settings['restart_per_product'])
                        ? ($perProductCounters[$variant->product_id] ??= $startNumber)
                        : $currentCounter++;

                    if (!empty($this->settings['restart_per_product'])) {
                        $perProductCounters[$variant->product_id]++;
                    }

                    $sku = $this->generateSku($number, $variant);

                    $skuMap[$variant->id] = $sku;
                    $batchProcessed++;
                } catch (\Exception $e) {
                    $failed++;
                    \Illuminate\Support\Facades\Redis::incr($redisKeyFailed);
                    $this->logWarning($jobLog, "Failed to generate SKU for variant {$variant->id}: " . $e->getMessage());
                }
            }

            if (!empty($skuMap)) {
                try {
                // Returns the local variant IDs Shopify actually accepted.
                $syncedIds = $shopify->updateVariantSkus((int)$productId, $skuMap);
                $syncedSet = array_flip($syncedIds);

                // OPTIMISTIC LOCAL UPDATE — only for variants confirmed synced.
                // Anything not confirmed stays "missing" and is counted as failed.
                foreach ($skuMap as $variantId => $newSku) {
                    if (!isset($syncedSet[$variantId])) continue;
                    try {
                        Variant::where('id', $variantId)->update(['sku' => $newSku]);
                    } catch (\Exception $e) {
                        // Ignore local update errors, webhook will fix eventually
                    }
                }

                $okCount   = count($syncedIds);
                $failCount = count($skuMap) - $okCount;

                if ($okCount > 0) {
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyProcessed, $okCount);
                    $processed += $okCount;
                    usleep(100000); // 0.1s Throttle (Reduced)
                }
                if ($failCount > 0) {
                    $failed += $failCount;
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyFailed, $failCount);
                    $reasons = !empty($shopify->lastSkuErrors)
                        ? ' Reason: ' . implode('; ', array_unique($shopify->lastSkuErrors))
                        : '';
                    $this->logWarning($jobLog, "Shopify did not accept {$failCount} SKU(s) for product {$productId}; they remain unchanged.{$reasons}");
                }
                } catch (\Exception $e) {
                    // Failed to sync
                    $failed += count($skuMap);
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyFailed, count($skuMap));
                    $this->logWarning($jobLog, "Failed to sync SKUs for product {$productId}: " . $e->getMessage());
                }
            }
        }
        
        // TTL for safety (24 hours)
        \Illuminate\Support\Facades\Redis::expire($redisKeyProcessed, 86400);
        \Illuminate\Support\Facades\Redis::expire($redisKeyFailed, 86400);

        // Detailed Logging
        if ($processed > 0) {
            $jobLog->activityLogs()->create([
                'level' => 'success',
                'title' => 'Batch Processed',
                'message' => "Successfully generated and synced SKUs for {$processed} variants.",
                'logged_at' => now(),
            ]);
        }
        if ($failed > 0) {
             $jobLog->activityLogs()->create([
                'level' => 'error',
                'title' => 'Batch Errors',
                'message' => "Failed to process {$failed} variants in this batch.",
                'logged_at' => now(),
            ]);
        }
    }

    private function logWarning($jobLog, $message) {
        $jobLog->activityLogs()->create([
            'level' => 'warning',
            'title' => 'Processing Warning',
            'message' => $message,
            'logged_at' => now(),
        ]);
    }

    public function failed(Throwable $exception)
    {
        if ($this->jobLogId) {
            $jobLog = JobLog::find($this->jobLogId);
            if ($jobLog) {
                $jobLog->markAsFailed("Batch job failed: " . $exception->getMessage());
                $jobLog->activityLogs()->create([
                    'level' => 'error',
                    'title' => 'Critical Batch Failure',
                    'message' => $exception->getMessage(),
                    'logged_at' => now(),
                ]);
            }
        }
    }

    private function generateSku(int $counter, Variant $variant): string
    {
        $s = $this->settings;
        $start = $s['auto_start'] ?? 1;
        // Fix: Use the length of the start number provided by user, 
        // effectively allowing "1" (pad 1) or "001" (pad 3).
        // If not provided, default to length of 1, but maybe we should default to 4 for backward compat?
        // Original logic was `max(strlen((string)$start), 4)`.
        // If user sends "1", strlen is 1. max(1,4) = 4. Result: 0001.
        // We want: strlen("1") -> 1.
        
        $startStr = (string)$start;
        $padLength = strlen($startStr);
        
        // Only default to 4 if the input was literally empty or missing, 
        // but $start is '1' by default in line 173.
        // So we really just want `strlen($startStr)`.
        // However, if they want "0001", they send "0001".
        
        $num = str_pad($counter, $padLength, '0', STR_PAD_LEFT);

        // Dynamic Source Logic
        $dynamicPart = '';
        if (!empty($s['source_field']) && $s['source_field'] !== 'none') {
            $text = match ($s['source_field']) {
                'product_title', 'title' => $variant->product->title ?? '',
                'variant_title' => $variant->title ?? '',
                'vendor_name', 'vendor' => $variant->product->vendor ?? '',
                'product_type', 'type' => $variant->product->product_type ?? '',
                default => '',
            };

            // Clean text (alphanumeric only)
            $text = preg_replace('/[^a-zA-Z0-9]/', '', $text);
            
            // Extract letters
            $len = (int)($s['source_len'] ?? 2);
            // Assuming 'first letters' is the standard behavior or based on `source_taking_method` 
            // but for now `substr` covers "First letters"
            $dynamicPart = strtoupper(substr($text, 0, $len));
        }

        $delimiter = $s['delimiter'] ?? '-';
        $prefix = $s['prefix'] ?? '';
        $suffix = $s['suffix'] ?? '';
        
        // Assemble
        // Logic: Prefix + [Dynamic] + Number + Suffix
        // Placement determines if Dynamic is before or after Number
        
        $mainPart = '';
        $placement = $s['source_placement'] ?? 'before'; // 'before' (Before Number) or 'after'
        
        if (!empty($dynamicPart)) {
            if ($placement === 'before') {
                $mainPart = $dynamicPart . $delimiter . $num;
            } else {
                $mainPart = $num . $delimiter . $dynamicPart;
            }
        } else {
            $mainPart = $num;
        }

        $parts = [];
        if (!empty($prefix)) $parts[] = $prefix;
        $parts[] = $mainPart;
        if (!empty($suffix)) $parts[] = $suffix;

        $sku = implode($delimiter, $parts);

        if (!empty($s['remove_spaces'])) {
            $sku = str_replace(' ', '', $sku);
        }

        if (!empty($s['alphanumeric'])) {
            $sku = preg_replace('/[^a-zA-Z0-9]/', '', $sku);
        }

        return $sku;
    }

}
