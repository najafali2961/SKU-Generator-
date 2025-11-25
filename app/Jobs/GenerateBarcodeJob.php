<?php

namespace App\Jobs;

use App\Models\Variant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;

class GenerateBarcodeJob implements ShouldQueue
{
    use Queueable;

    protected $shopId;
    protected $data;

    public function __construct($shopId, $data)
    {
        $this->shopId = $shopId;
        $this->data = $data;
    }

    public function handle()
    {
        $variants = Variant::whereHas('product', fn($q) => $q->where('user_id', $this->shopId));

        if ($this->data['apply_scope'] === 'selected') {
            $variants->whereIn('id', $this->data['selected_variant_ids']);
        }

        $total = $variants->count();
        $processed = 0;

        $variants->chunk(100, function ($chunk) use (&$processed, $total) {
            foreach ($chunk as $variant) {
                $newBarcode = $this->generateForVariant($variant, $this->data);
                $variant->barcode = $newBarcode;
                $variant->saveQuietly();

                $processed++;
                Cache::put("barcode_progress_{$this->shopId}", (int)(($processed / $total) * 100), 600);
            }
        });

        Cache::forget("barcode_progress_{$this->shopId}");
    }

    private function generateForVariant($variant, $rules)
    {
        // Same logic as in preview() — extract to service later
        // Reuse the same generation logic here
        // For brevity, reuse controller method or extract to service
    }
}
