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

        Log::info('[BARCODE-JOB] Starting batch', [
            'format' => $this->settings['format'] ?? 'UNKNOWN',
            'prefix' => $this->settings['prefix'] ?? '',
            'start_number' => $this->settings['start_number'] ?? 1,
            'variant_count' => count($this->variantIds),
        ]);

        $shopify = new ShopifyService($shop);

        $variants = Variant::with('product')->whereIn('id', $this->variantIds)->get();
        if ($variants->isEmpty()) return;

        $processed = 0;
        $failed = 0;
        $productsToSync = [];

        // ✅ WRAP EVERYTHING IN A TRANSACTION
        DB::beginTransaction();

        try {
            foreach ($variants as $variant) {
                try {
                    // ✅ GET ATOMIC COUNTER FROM DATABASE (NOT CACHE)
                    $counter = $this->getNextBarcodeCounter();

                    $newBarcode = $this->generateBarcode($variant, $this->settings, $counter);

                    if ($processed < 3) {
                        Log::info('[BARCODE-JOB] Generated', [
                            'variant_id' => $variant->id,
                            'new_barcode' => $newBarcode,
                            'counter' => $counter,
                        ]);
                    }

                    // ✅ SAVE TO LOCAL DB WITHIN TRANSACTION
                    $variant->barcode = $newBarcode;
                    $variant->save();

                    // Collect for bulk Shopify sync
                    $productsToSync[$variant->product_id][$variant->id] = $newBarcode;

                    $jobLog->success(
                        "Barcode Generated",
                        "{$variant->product->title} – {$variant->title} → {$newBarcode}"
                    );

                    $processed++;
                } catch (\Exception $e) {
                    Log::error('[BARCODE-JOB] Generation failed', [
                        'variant_id' => $variant->id,
                        'error' => $e->getMessage(),
                    ]);
                    $jobLog->error("Generation Failed", "Variant #{$variant->id}: " . $e->getMessage());
                    $failed++;
                    throw $e; // Rollback entire batch if any fails
                }
            }

            // ✅ COMMIT BEFORE SHOPIFY SYNC
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('[BARCODE-JOB] Batch transaction failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }

        // ✅ SYNC TO SHOPIFY AFTER LOCAL DB SUCCESS
        foreach ($productsToSync as $productId => $barcodeMap) {
            try {
                $success = $shopify->updateVariantBarcodes((int)$productId, $barcodeMap);

                if ($success) {
                    $jobLog->info("Synced to Shopify", "Product ID {$productId} – " . count($barcodeMap) . " variants");
                } else {
                    Log::warning("[BARCODE-BATCH] Shopify sync returned false", ['product_id' => $productId]);
                    $jobLog->warning("Shopify Sync Failed", "Product ID {$productId}");
                }
            } catch (\Exception $e) {
                Log::error("[BARCODE-BATCH] Shopify sync exception", [
                    'product_id' => $productId,
                    'error' => $e->getMessage(),
                ]);
                $jobLog->error("Shopify Sync Error", "Product ID {$productId}: " . $e->getMessage());
            }
        }

        $jobLog->increment('processed_items', $processed);
        if ($failed > 0) {
            $jobLog->increment('failed_items', $failed);
        }
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

    /**
     * ✅ ATOMIC DATABASE COUNTER (SAME AS SKU SYSTEM)
     */
    private function getNextBarcodeCounter(): int
    {
        return DB::transaction(function () {
            $format = $this->settings['format'] ?? 'UPC';
            $startNumber = (int)($this->settings['start_number'] ?? 1);

            $row = DB::table('barcode_counters')
                ->lockForUpdate()
                ->where('shop_id', $this->shopId)
                ->where('format', $format)
                ->first();

            if (!$row) {
                DB::table('barcode_counters')->insert([
                    'shop_id' => $this->shopId,
                    'format' => $format,
                    'counter' => $startNumber,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return $startNumber;
            }

            $next = $row->counter + 1;
            DB::table('barcode_counters')
                ->where('id', $row->id)
                ->update(['counter' => $next, 'updated_at' => now()]);

            return $next;
        });
    }

    /**
     * ✅ FIXED BARCODE GENERATION (MATCHES CONTROLLER)
     */
    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = trim($rules['prefix'] ?? '');
        $suffix = trim($rules['suffix'] ?? '');
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;
        $enforce_length = $rules['enforce_length'] ?? true;

        // QR CODE / DATA MATRIX / PDF417
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

        // CODE128 / CODE39
        if (in_array($format, ['CODE128', 'CODE128A', 'CODE128B', 'CODE128C', 'CODE39'])) {
            $base = $prefix . ($variant->sku ?: "V{$variant->id}") . $suffix;
            return $numeric_only ? preg_replace('/\D/', '', $base) : $base;
        }

        // UPC / EAN / ISBN
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
