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
        /** @var User */
        $shop = User::find($this->shopId);
        if (!$shop) return;

        $jobLog = JobLog::findOrFail($this->jobLogId);
        $jobLog->update([
            'status' => 'running',
            'total_items' => count($this->barcodeData),
            'processed_items' => 0
        ]);

        $total = count($this->barcodeData);
        
        // 1. Map ShopifyVariantID -> NewBarcode
        $barcodeMap = [];
        foreach ($this->barcodeData as $item) {
            $sid = strval($item['shopify_variant_id']);
            $barcodeMap[$sid] = trim($item['barcode']);
        }

        $shopifyVariantIds = array_keys($barcodeMap);

        // 2. Fetch local variants (READ ONLY)
        // Only fetch fields we need: id, product_id, shopify_variant_id
        $variants = Variant::whereIn('shopify_variant_id', $shopifyVariantIds)
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->select(['id', 'product_id', 'shopify_variant_id'])
            ->get();

        if ($variants->isEmpty()) {
            $jobLog->markAsCompleted("No matching variants found in database.");
            return;
        }

        // 3. Group by Product for Bulk API
        // Structure: [productId => [variantId => barcode]]
        $productsToSync = [];
        
        foreach ($variants as $variant) {
            $sid = (string)$variant->shopify_variant_id;
            if (isset($barcodeMap[$sid])) {
                $productsToSync[$variant->product_id][$variant->id] = $barcodeMap[$sid];
            }
        }

        // 4. Batch Dispatch
        // Chunk by PRODUCTS (e.g. 50 products per job) to keep batch payload manageable
        $productChunks = array_chunk($productsToSync, 50, true);
        $batches = [];

        foreach ($productChunks as $chunk) {
            $batches[] = new \App\Jobs\SyncImportedBarcodesBatchJob(
                $shop->id,
                $jobLog->id,
                $chunk
            );
        }

        Bus::batch($batches)
            ->name("Barcode Import Sync - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($shop) {
                // Optional: Final cleanup or notify
            })
            ->finally(function (Batch $batch) use ($jobLog, $total) {
                // Check for failures
                if ($batch->cancelled()) {
                    $jobLog->markAsFailed("Batch cancelled");
                } else {
                    $jobLog->markAsCompleted("Processed import of {$total} barcodes.");
                }
            })
            ->dispatch();
    }
}
