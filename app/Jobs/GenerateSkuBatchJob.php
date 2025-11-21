<?php
// GenerateSkuBatchJob.php
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

    public function __construct($shopId, $settings, array $variantIds)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
        $this->variantIds = $variantIds;
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')->whereIn('id', $this->variantIds)->get();
        if ($variants->isEmpty()) {
            Log::info("[SKU BATCH] No variants to process in this batch.");
            return;
        }

        $counter = $this->settings['auto_start'] ?? 1;

        foreach ($variants->groupBy('product_id') as $productId => $productVariants) {
            $skuMap = [];
            foreach ($productVariants as $variant) {
                $sku = $this->generateSku($counter++);
                $variant->sku = $sku;
                $variant->save();
                $skuMap[$variant->id] = $sku;
            }

            $shopify->updateVariantSkus((int)$productId, $skuMap);
        }

        Log::info("[SKU BATCH] Completed batch. Variants processed: " . count($variants));
    }

    private function generateSku(int $counter): string
    {
        $s = $this->settings;
        $num = str_pad($counter, strlen($s['auto_start'] ?? '1'), '0', STR_PAD_LEFT);
        $sku = ($s['prefix'] ?? '') . ($s['delimiter'] ?? '') . $num;
        if (!empty($s['suffix'])) $sku .= ($s['delimiter'] ?? '') . $s['suffix'];
        if (!empty($s['remove_spaces'])) $sku = str_replace(' ', '', $sku);
        if (!empty($s['alphanumeric'])) $sku = preg_replace('/[^A-Za-z0-9\-]/', '', $sku);
        return $sku;
    }
}
