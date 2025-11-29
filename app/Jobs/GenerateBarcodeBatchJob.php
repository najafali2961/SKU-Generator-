<?php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\JobLog;
use App\Services\ShopifyService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GenerateBarcodeBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;

    public $shopId;
    public $settings;
    public $variantIds;
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
        if ($this->batch()?->cancelled()) return;

        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $shop = \App\Models\User::find($this->shopId);
        if (!$shop) return;

        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')->whereIn('id', $this->variantIds)->get();
        if ($variants->isEmpty()) return;

        $processed = 0;
        $failed = 0;
        $counter = $this->getStartingCounter();

        // Group by product for bulk update
        $productsToSync = [];

        foreach ($variants as $variant) {
            try {
                $newBarcode = $this->generateBarcode($variant, $this->settings, $counter);

                // Save to local DB
                $variant->barcode = $newBarcode;
                $variant->save();

                // Collect for bulk Shopify sync
                $productsToSync[$variant->product_id][$variant->id] = $newBarcode;

                $jobLog->success(
                    "Barcode Generated",
                    "{$variant->product->title} – {$variant->title} → {$newBarcode}"
                );

                $processed++;
                $counter++;
            } catch (\Exception $e) {
                Log::error("[BARCODE-BATCH] Generation failed for variant {$variant->id}", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $jobLog->error("Generation Failed", "Variant #{$variant->id}: " . $e->getMessage());
                $failed++;
            }
        }

        // BULK SYNC TO SHOPIFY
        foreach ($productsToSync as $productId => $barcodeMap) {
            try {
                Log::info("[BARCODE-BATCH] Attempting Shopify sync", [
                    'product_id' => $productId,
                    'variant_count' => count($barcodeMap),
                    'barcodes' => $barcodeMap,
                ]);

                $success = $shopify->updateVariantBarcodes((int)$productId, $barcodeMap);

                if ($success) {
                    $jobLog->info("Synced to Shopify", "Product ID {$productId} – " . count($barcodeMap) . " variants");
                    Log::info("[BARCODE-BATCH] Shopify sync successful", [
                        'product_id' => $productId,
                        'variant_count' => count($barcodeMap),
                    ]);
                } else {
                    Log::warning("[BARCODE-BATCH] Shopify sync returned false", [
                        'product_id' => $productId,
                    ]);
                    $jobLog->warning("Shopify Sync Failed", "Product ID {$productId}");
                    $failed += count($barcodeMap);
                }
            } catch (\Exception $e) {
                Log::error("[BARCODE-BATCH] Shopify sync exception", [
                    'product_id' => $productId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $jobLog->error("Shopify Sync Error", "Product ID {$productId}: " . $e->getMessage());
                $failed += count($barcodeMap);
            }
        }

        $jobLog->increment('processed_items', $processed);
        if ($failed > 0) {
            $jobLog->increment('failed_items', $failed);
        }

        Log::info("[BARCODE-BATCH] Batch complete", [
            'shop_id' => $this->shopId,
            'processed' => $processed,
            'failed' => $failed,
            'total' => count($this->variantIds),
        ]);
    }

    public function failed(Throwable $exception)
    {
        $jobLog = JobLog::find($this->jobLogId);
        if ($jobLog) {
            Log::error("[BARCODE-BATCH] Job failed", [
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);
            $jobLog->error('Batch Failed', $exception->getMessage());
            $jobLog->markAsFailed("Batch failed: " . $exception->getMessage());
        }
    }

    private function getStartingCounter(): int
    {
        $start = (int)($this->settings['start_number'] ?? 1);
        $cacheKey = "barcode_counter_{$this->shopId}";
        $current = Cache::get($cacheKey, $start - 1);
        $next = $current + 1;
        Cache::put($cacheKey, $next, 3600);
        return $next;
    }

    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = strtoupper(trim($rules['prefix'] ?? ''));
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;

        if ($format === 'QR') {
            return ($rules['allow_qr_text'] ?? false)
                ? ($variant->sku ?: "https://{$this->shop->myshopify_domain}/products/{$variant->product->handle}")
                : 'QR-' . strtoupper(Str::random(12));
        }

        if ($format === 'CODE128') {
            return $prefix . ($variant->sku ?: "V{$variant->id}");
        }

        $targetLength = in_array($format, ['UPC', 'UPCA']) ? 12 : 13;
        $base = $prefix . ($variant->sku ? preg_replace('/\D/', '', $variant->sku) : $counter);

        if ($numeric_only) {
            $base = preg_replace('/\D/', '', $base);
        }

        $code = substr($base, 0, $targetLength - ($checksum ? 1 : 0));

        if ($auto_fill) {
            $code = str_pad($code, $targetLength - ($checksum ? 1 : 0), '0', STR_PAD_LEFT);
        }

        if ($checksum) {
            $code .= $this->calculateCheckDigit($code, $targetLength);
        }

        return $code;
    }

    private function calculateCheckDigit($number, $length = 12)
    {
        $number = preg_replace('/\D/', '', $number);
        $number = str_pad($number, $length === 12 ? 11 : 12, '0', STR_PAD_LEFT);

        $sum = 0;
        for ($i = strlen($number) - 1; $i >= 0; $i--) {
            $weight = ($i % 2 === ($length === 12 ? 1 : 0)) ? 3 : 1;
            $sum += $number[$i] * $weight;
        }

        return (10 - ($sum % 10)) % 10;
    }
}
