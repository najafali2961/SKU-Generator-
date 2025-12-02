<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Variant;
use App\Models\JobLog;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportBarcodesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;
    public $barcodeData; // Array of ['shopify_variant_id' => ..., 'barcode' => ...]
    public $jobLogId;

    public function __construct($shopId, $barcodeData, $jobLogId)
    {
        $this->shopId = $shopId;
        $this->barcodeData = $barcodeData;
        $this->jobLogId = $jobLogId;
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        if (!$shop) return;

        $jobLog = JobLog::findOrFail($this->jobLogId);
        $jobLog->update(['status' => 'running']);

        $total = count($this->barcodeData);
        $variantIds = [];

        // Step 1: Update database
        DB::beginTransaction();
        try {
            foreach ($this->barcodeData as $item) {
                $shopifyId = strval($item['shopify_variant_id']);
                $newBarcode = trim($item['barcode']);

                $variant = Variant::where('shopify_variant_id', $shopifyId)
                    ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
                    ->first();

                if (!$variant) {
                    Log::warning("Import: Variant not found - Shopify ID: $shopifyId");
                    continue;
                }

                $variant->update(['barcode' => $newBarcode]);
                $variantIds[] = $variant->id;
            }

            DB::commit();
            Log::info("ImportBarcodesJob: Updated {$total} variants in database");
        } catch (\Exception $e) {
            DB::rollBack();
            $jobLog->markAsFailed("Database update failed: " . $e->getMessage());
            return;
        }

        // Step 2: Sync to Shopify in batches
        if (empty($variantIds)) {
            $jobLog->markAsCompleted("No variants were updated.");
            return;
        }

        $batchSize = 100;
        $chunks = array_chunk($variantIds, $batchSize);
        $batches = [];

        foreach ($chunks as $chunk) {
            $batches[] = new \App\Jobs\SyncBarcodesToShopifyJob(
                $shop->id,
                $chunk,
                $jobLog->id
            );
        }

        Bus::batch($batches)
            ->name("Barcode Import Sync - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($jobLog, $total) {
                $jobLog->markAsCompleted("Successfully imported and synced {$total} barcodes to Shopify.");
            })
            ->catch(function (Batch $batch, \Throwable $e) use ($jobLog) {
                $jobLog->markAsFailed("Shopify sync failed: " . $e->getMessage());
            })
            ->dispatch();

        Log::info("ImportBarcodesJob: Dispatched Shopify sync for {$total} variants");
    }
}
