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

        // Use Redis for high-speed progress tracking to avoid DB row locks
        $redisKeyProcessed = "job_progress_{$this->jobLogId}";
        $redisKeyFailed    = "job_failed_{$this->jobLogId}";

        foreach ($variants->groupBy('product_id') as $productId => $productVariants) {
            $skuMap = [];
            $batchProcessed = 0;

            foreach ($productVariants as $variant) {
                try {
                    $sku = $this->generateSku($currentCounter);
                    $currentCounter++; 

                    $skuMap[$variant->id] = $sku;
                    $batchProcessed++;
                } catch (\Exception $e) {
                    $failed++;
                    \Illuminate\Support\Facades\Redis::incr($redisKeyFailed);
                }
            }

            if (!empty($skuMap)) {
                try {
                    $shopify->updateVariantSkus((int)$productId, $skuMap);
                    usleep(200000); // 0.2s Throttle
                    
                    // Atomic increment for the whole product batch
                    if ($batchProcessed > 0) {
                        \Illuminate\Support\Facades\Redis::incrby($redisKeyProcessed, $batchProcessed);
                    }
                } catch (\Exception $e) {
                    // Failed to sync
                    $failed += count($skuMap);
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyFailed, count($skuMap));
                }
            }
        }
        
        // TTL for safety (24 hours)
        \Illuminate\Support\Facades\Redis::expire($redisKeyProcessed, 86400);
        \Illuminate\Support\Facades\Redis::expire($redisKeyFailed, 86400);
    }

    public function failed(Throwable $exception)
    {
        if ($this->jobLogId) {
            $jobLog = JobLog::find($this->jobLogId);
            if ($jobLog) {
                $jobLog->markAsFailed("Batch job failed: " . $exception->getMessage());
            }
        }
    }

    private function generateSku(int $counter): string
    {
        $s = $this->settings;
        $start = $s['auto_start'] ?? 1;
        $padLength = max(strlen((string)$start), 4);
        $num = str_pad($counter, $padLength, '0', STR_PAD_LEFT);

        $sku = ($s['prefix'] ?? '') . ($s['delimiter'] ?? '') . $num;

        if (!empty($s['suffix'])) {
            $sku .= ($s['delimiter'] ?? '') . $s['suffix'];
        }

        if (!empty($s['remove_spaces'])) {
            $sku = str_replace(' ', '', $sku);
        }

        return $sku;
    }
}
