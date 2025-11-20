<?php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\User;
use App\Services\ShopifyService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateSkuBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;
    public $variantIds;
    public $settings;
    public $batchStart;

    public function __construct($shopId, $settings, array $variantIds, int $batchStart)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
        $this->variantIds = $variantIds;
        $this->batchStart = $batchStart;
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')
            ->whereIn('id', $this->variantIds)
            ->get();

        if ($variants->isEmpty()) return;

        $counter = $this->batchStart;

        Log::info("[SKU BATCH] Starting", ['variants' => $variants->count(), 'counter' => $counter]);

        // Group by product → one productSet call per product
        foreach ($variants->groupBy('product_id') as $productId => $productVariants) {
            $skuMap = [];

            foreach ($productVariants as $variant) {
                $sku = $this->generateBatchSku($counter);

                Log::info("Assigning SKU", [
                    'variant_id' => $variant->id,
                    'sku' => $sku
                ]);

                $variant->sku = $sku;
                $variant->save();

                $skuMap[$variant->id] = $sku;
                $counter++;
            }

            // THIS IS THE ONLY CALL THAT WORKS IN 2025-10
            $shopify->updateVariantSkus((int)$productId, $skuMap);

            Log::info("[SKU BATCH] productSet called for product {$productId} with " . count($skuMap) . " variants");
        }

        Log::info("[SKU BATCH] Completed", ['next_counter' => $counter]);
    }

    private function generateBatchSku(int $counter): string
    {
        $s = $this->settings;
        $len = strlen($s['auto_start'] ?? '1');
        $num = str_pad($counter, $len, '0', STR_PAD_LEFT);

        $sku = ($s['prefix'] ?? '') . ($s['delimiter'] ?? '') . $num;

        if (!empty($s['suffix'])) {
            $sku .= ($s['delimiter'] ?? '') . $s['suffix'];
        }

        if (!empty($s['remove_spaces'])) {
            $sku = str_replace(' ', '', $sku);
        }

        if (!empty($s['alphanumeric'])) {
            $sku = preg_replace('/[^A-Za-z0-9\-]/', '', $sku);
        }

        return $sku;
    }
}
