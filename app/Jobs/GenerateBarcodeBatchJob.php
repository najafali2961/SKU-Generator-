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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GenerateBarcodeBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, Batchable;
    
    public $timeout = 1800; // Increased to 30 minutes

    public $shopId;
    public $settings;
    public $variantIds;
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
        $productsToSync = [];

        // Use Reserved Counter
        $currentCounter = $this->startCounter;

        // Use Redis for high-speed progress tracking
        $redisKeyProcessed = "job_progress_{$this->jobLogId}";
        $redisKeyFailed    = "job_failed_{$this->jobLogId}";
        
        foreach ($variants as $variant) {
            try {
                // Use reserved counter (in-memory increment)
                $newBarcode = $this->generateBarcode($variant, $this->settings, $currentCounter);
                $currentCounter++; // Local increment

                // Collect for bulk Shopify sync
                $productsToSync[$variant->product_id][$variant->id] = $newBarcode;
                // processed count is incremented after sync
            } catch (\Exception $e) {
                $failed++;
                \Illuminate\Support\Facades\Redis::incr($redisKeyFailed);
                $this->logWarning($jobLog, "Failed to generate barcode for variant {$variant->id}: " . $e->getMessage());
            }
        }

        foreach ($productsToSync as $productId => $barcodeMap) {
            try {
                // Returns the local variant IDs Shopify actually accepted, so a
                // transient throttle or a single bad/deleted variant can no longer
                // silently drop the whole product.
                $syncedIds = $shopify->updateVariantBarcodes((int)$productId, $barcodeMap);
                $syncedSet = array_flip($syncedIds);

                // OPTIMISTIC LOCAL UPDATE — but ONLY for variants confirmed synced.
                // Anything not confirmed stays "missing" and is counted as failed,
                // instead of being marked done while Shopify never got the barcode.
                foreach ($barcodeMap as $variantId => $newBarcode) {
                    if (!isset($syncedSet[$variantId])) continue;
                    try {
                        Variant::where('id', $variantId)->update(['barcode' => $newBarcode]);
                    } catch (\Exception $e) {
                        // Ignore local update errors, webhook will fix eventually
                    }
                }

                $okCount   = count($syncedIds);
                $failCount = count($barcodeMap) - $okCount;

                if ($okCount > 0) {
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyProcessed, $okCount);
                    $processed += $okCount;
                    usleep(100000); // 0.1s Throttle (Reduced)
                }
                if ($failCount > 0) {
                    $failed += $failCount;
                    \Illuminate\Support\Facades\Redis::incrby($redisKeyFailed, $failCount);
                    $this->logWarning($jobLog, "Shopify did not accept {$failCount} variant(s) for product {$productId}; they remain unchanged.");
                }
            } catch (\Exception $e) {
                $failed += count($barcodeMap);
                \Illuminate\Support\Facades\Redis::incrby($redisKeyFailed, count($barcodeMap));
                $this->logWarning($jobLog, "Failed to sync barcodes for product {$productId}: " . $e->getMessage());
            }
        }
        
        // TTL
        \Illuminate\Support\Facades\Redis::expire($redisKeyProcessed, 86400);
        \Illuminate\Support\Facades\Redis::expire($redisKeyFailed, 86400);

        // Detailed Logging
        if ($processed > 0) {
            $jobLog->activityLogs()->create([
                'level' => 'success',
                'title' => 'Batch Processed',
                'message' => "Successfully generated and synced barcodes for {$processed} variants.",
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
        $jobLog = JobLog::find($this->jobLogId);
        if ($jobLog) {
            $jobLog->markAsFailed("Batch failed: " . $exception->getMessage());
        }
    }

    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = trim($rules['prefix'] ?? '');
        $suffix = trim($rules['suffix'] ?? '');
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;
        $enforce_length = $rules['enforce_length'] ?? true;

        if (in_array($format, ['QR', 'DATAMATRIX', 'PDF417'])) {
            if ($rules['allow_qr_text'] ?? false) {
                $text = trim($rules['qr_text'] ?? '');

                if (empty($text)) {
                    return $variant->sku ?: "https://shop.com/products/{$variant->product->handle}";
                }

                $replacements = [
                    '{{title}}' => $variant->product->title ?? '',
                    '{{ title }}' => $variant->product->title ?? '',
                    '{{handle}}' => $variant->product->handle ?? '',
                    '{{ handle }}' => $variant->product->handle ?? '',
                    '{{id}}' => (string)$variant->id,
                    '{{ id }}' => (string)$variant->id,
                    '{{sku}}' => $variant->sku ?? '',
                    '{{ sku }}' => $variant->sku ?? '',
                    '{{product_id}}' => (string)$variant->product_id,
                    '{{ product_id }}' => (string)$variant->product_id,
                    '{{variant_id}}' => (string)$variant->id,
                    '{{ variant_id }}' => (string)$variant->id,
                ];

                return str_replace(
                    array_keys($replacements),
                    array_values($replacements),
                    $text
                );
            }
            return 'QR-' . strtoupper(Str::random(12));
        }

        if (in_array($format, ['CODE128', 'CODE128A', 'CODE128B', 'CODE128C', 'CODE39'])) {
            $base = $prefix . ($variant->sku ?: "V{$variant->id}") . $suffix;
            return $numeric_only ? preg_replace('/\D/', '', $base) : $base;
        }

        $targetLength = match ($format) {
            'UPC', 'UPCA' => 12,
            'UPCE' => 8,
            'EAN8' => 8,
            'ITF14' => 14,
            default => 13,
        };

        $base = $prefix . str_pad($counter, 6, '0', STR_PAD_LEFT) . $suffix;

        if ($numeric_only) {
            $base = preg_replace('/\D/', '', $base);
        }

        $code = substr($base, 0, $targetLength - ($checksum ? 1 : 0));

        if ($auto_fill) {
            $code = str_pad($code, $targetLength - ($checksum ? 1 : 0), '0', STR_PAD_LEFT);
        }

        if ($enforce_length && strlen($code) != ($targetLength - ($checksum ? 1 : 0))) {
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
