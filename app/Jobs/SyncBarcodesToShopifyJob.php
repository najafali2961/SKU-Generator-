<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Variant;
use App\Models\JobLog;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncBarcodesToShopifyJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;
    public $variantIds;
    public $jobLogId;

    public function __construct($shopId, $variantIds, $jobLogId)
    {
        $this->shopId = $shopId;
        $this->variantIds = $variantIds;
        $this->jobLogId = $jobLogId;
    }

    public function handle()
    {
        if ($this->batch()->cancelled()) {
            return;
        }

        $shop = User::find($this->shopId);
        if (!$shop) return;

        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $variants = Variant::whereIn('id', $this->variantIds)
            ->whereHas('product', fn($q) => $q->where('user_id', $shop->id))
            ->get();

        $processed = 0;
        $failed = 0;

        foreach ($variants as $variant) {
            try {
                $shopifyVariantId = $variant->shopify_variant_id;
                $barcode = $variant->barcode;

                // Make Shopify API call
                $response = $shop->api()->rest('PUT', "/admin/api/2024-10/variants/{$shopifyVariantId}.json", [
                    'variant' => [
                        'id' => $shopifyVariantId,
                        'barcode' => $barcode,
                    ]
                ]);

                if ($response['errors'] ?? false) {
                    throw new \Exception(json_encode($response['errors']));
                }

                $processed++;

                // Update progress
                $jobLog->increment('processed_items');
            } catch (\Exception $e) {
                $failed++;
                Log::error("Failed to sync barcode to Shopify", [
                    'variant_id' => $variant->id,
                    'shopify_variant_id' => $variant->shopify_variant_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        Log::info("SyncBarcodesToShopifyJob: Processed {$processed}, Failed {$failed}");
    }
}
