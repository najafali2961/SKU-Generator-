<?php

namespace App\Jobs;

use App\Models\JobLog;
use App\Models\User;
use App\Services\ShopifyService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

class SyncImportedBarcodesBatchJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1800; // 30 minutes

    public $shopId;
    public $jobLogId;
    public $syncData; // [productId => [variantId => barcode]]

    public function __construct($shopId, $jobLogId, array $syncData)
    {
        $this->shopId = $shopId;
        $this->jobLogId = $jobLogId;
        $this->syncData = $syncData;
        $this->onQueue('default');
    }

    public function handle()
    {
        if ($this->batch()?->cancelled()) return;

        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $shop = User::find($this->shopId);
        if (!$shop) return;

        $shopify = new ShopifyService($shop);
        $redisKeyProcessed = "job_progress_{$this->jobLogId}";
        $redisKeyFailed    = "job_failed_{$this->jobLogId}";

        $processed = 0;
        $failed = 0;

        foreach ($this->syncData as $productId => $barcodeMap) {
            try {
                // Call Shopify Bulk Update (GraphQL) — returns the variant IDs
                // Shopify actually accepted, so partial failures are counted honestly.
                $syncedIds = $shopify->updateVariantBarcodes((int)$productId, $barcodeMap);
                $okCount   = count($syncedIds);
                $failCount = count($barcodeMap) - $okCount;

                if ($okCount > 0) {
                    Redis::incrby($redisKeyProcessed, $okCount);
                    $processed += $okCount;

                    // Throttle slightly to be safe
                    usleep(100000); // 0.1s
                }
                if ($failCount > 0) {
                    $failed += $failCount;
                    Redis::incrby($redisKeyFailed, $failCount);
                    $this->logWarning($jobLog, "Shopify did not accept {$failCount} variant(s) for product {$productId}");
                }
            } catch (\Exception $e) {
                $count = count($barcodeMap);
                $failed += $count;
                Redis::incrby($redisKeyFailed, $count);
                $this->logWarning($jobLog, "Exception syncing product {$productId}: " . $e->getMessage());
            }
        }

        // Extend Redis key TTL
        Redis::expire($redisKeyProcessed, 86400);
        Redis::expire($redisKeyFailed, 86400);

        if ($processed > 0) {
            $jobLog->activityLogs()->create([
                'level' => 'success',
                'title' => 'Import Batch Synced',
                'message' => "Synced {$processed} barcodes to Shopify.",
                'logged_at' => now(),
            ]);
        }
    }

    private function logWarning($jobLog, $message) {
        $jobLog->activityLogs()->create([
            'level' => 'warning',
            'title' => 'Import Sync Warning',
            'message' => $message,
            'logged_at' => now(),
        ]);
    }

    public function failed(Throwable $exception)
    {
        $jobLog = JobLog::find($this->jobLogId);
        if ($jobLog) {
            $jobLog->markAsFailed("Batch failed: " . $exception->getMessage());
        }
    }
}
