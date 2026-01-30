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
                    $sku = $this->generateSku($currentCounter, $variant);
                    $currentCounter++; 

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
                    $shopify->updateVariantSkus((int)$productId, $skuMap);
                    usleep(200000); // 0.2s Throttle
                    
                    // Atomic increment for the whole product batch
                    if ($batchProcessed > 0) {
                        \Illuminate\Support\Facades\Redis::incrby($redisKeyProcessed, $batchProcessed);
                        $processed += $batchProcessed;
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
        $padLength = max(strlen((string)$start), 4);
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

        return $sku;
    }
}
