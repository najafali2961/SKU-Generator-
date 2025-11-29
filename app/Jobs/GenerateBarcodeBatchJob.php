<?php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\JobLog;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
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
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $variants = Variant::with('product')->whereIn('id', $this->variantIds)->get();
        if ($variants->isEmpty()) return;

        $processed = 0;
        $failed = 0;
        $counter = $this->getStartingCounter();

        foreach ($variants as $variant) {
            try {
                $newBarcode = $this->generateBarcode($variant, $this->settings, $counter);

                $variant->barcode = $newBarcode;
                $variant->saveQuietly();

                $jobLog->success(
                    "Barcode Generated",
                    "Variant #{$variant->id} → {$variant->product->title} → {$newBarcode}"
                );

                $processed++;
                $counter++;
            } catch (\Exception $e) {
                $jobLog->error(
                    "Failed to generate barcode",
                    "Variant #{$variant->id}: " . $e->getMessage()
                );
                $failed++;
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
            $jobLog->error('Batch Failed', $exception->getMessage());
            $jobLog->markAsFailed("Batch failed: " . $exception->getMessage());
        }
    }

    private function getStartingCounter(): int
    {
        $start = (int)($this->settings['start_number'] ?? 1);
        $cacheKey = "barcode_counter_{$this->shopId}";
        $current = \Cache::get($cacheKey, $start - 1);
        return $current + 1;
    }

    private function generateBarcode($variant, $rules, $counter)
    {
        $format = $rules['format'] ?? 'UPC';
        $prefix = strtoupper(trim($rules['prefix'] ?? ''));
        $checksum = $rules['checksum'] ?? true;
        $numeric_only = $rules['numeric_only'] ?? true;
        $auto_fill = $rules['auto_fill'] ?? true;

        if ($format === 'QR') {
            return $rules['allow_qr_text'] ?? false
                ? ($variant->sku ?: "https://shop.com/p/{$variant->product->handle}")
                : 'QR-' . strtoupper(\Str::random(12));
        }

        if ($format === 'CODE128') {
            return $prefix . ($variant->sku ?: "V{$variant->id}");
        }

        $targetLength = $format === 'UPC' ? 12 : ($format === 'EAN' ? 13 : 13);
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
