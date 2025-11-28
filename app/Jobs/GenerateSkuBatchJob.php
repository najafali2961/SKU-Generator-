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
use Throwable;

class GenerateSkuBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;

    public $shopId;
    public $variantIds;
    public $settings;
    public $jobLogId;

    public function __construct($shopId, $settings, array $variantIds, $jobLogId)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
        $this->variantIds = $variantIds;
        $this->jobLogId = $jobLogId;
    }

    public function handle()
    {
        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $shop = User::find($this->shopId);
        if (!$shop) return;

        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')
            ->whereIn('id', $this->variantIds)
            ->get();

        if ($variants->isEmpty()) return;

        $jobLog->info("Processing Batch", "Starting batch of {$variants->count()} variants");

        $processed = 0;
        $failed = 0;

        foreach ($variants->groupBy('product_id') as $productId => $productVariants) {
            $skuMap = [];

            foreach ($productVariants as $variant) {
                try {
                    $counter = $this->getNextGlobalCounter();
                    $sku = $this->generateSku($counter);

                    $variant->sku = $sku;
                    $variant->save();

                    $skuMap[$variant->id] = $sku;

                    $jobLog->success("SKU Assigned", "Variant #{$variant->id} → {$sku}");
                    $processed++;
                } catch (\Exception $e) {
                    $jobLog->error("SKU Generation Failed", "Variant #{$variant->id}: " . $e->getMessage());
                    $failed++;
                }
            }

            if (!empty($skuMap)) {
                try {
                    $shopify->updateVariantSkus((int)$productId, $skuMap);
                    $jobLog->info("Synced to Shopify", "Product ID {$productId} updated");
                } catch (\Exception $e) {
                    $jobLog->error("Shopify Sync Failed", "Product ID {$productId}: " . $e->getMessage());
                    $failed += count($skuMap);
                }
            }
        }

        // Update progress
        $jobLog->increment('processed_items', $processed);
        if ($failed > 0) {
            $jobLog->increment('failed_items', $failed);
        }
    }

    public function failed(Throwable $exception)
    {
        if ($this->jobLogId) {
            $jobLog = JobLog::find($this->jobLogId);
            if ($jobLog) {
                $jobLog->error('Batch Failed', $exception->getMessage());
                $jobLog->markAsFailed("Batch job failed: " . $exception->getMessage());
            }
        }
    }

    private function getNextGlobalCounter(): int
    {
        return DB::transaction(function () {
            $row = DB::table('sku_counters')
                ->lockForUpdate()
                ->where('shop_id', $this->shopId)
                ->whereNull('product_id')
                ->first();

            $start = $this->settings['auto_start'] ?? 1;

            if (!$row) {
                DB::table('sku_counters')->insert([
                    'shop_id' => $this->shopId,
                    'product_id' => null,
                    'counter' => $start,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return $start;
            }

            $next = $row->counter + 1;
            DB::table('sku_counters')
                ->where('id', $row->id)
                ->update(['counter' => $next, 'updated_at' => now()]);

            return $next;
        });
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
