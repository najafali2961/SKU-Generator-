<?php
// app/Jobs/GenerateSkuJob.php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateSkuJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;
    public $settings;

    public function __construct($shopId, $settings)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        if (!$shop) return;

        $query = Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
        }

        if (!empty($this->settings['only_missing'])) {
            $query->whereNull('sku');
        }

        if (!empty($this->settings['vendor'])) {
            $query->whereHas('product', fn($p) => $p->where('vendor', $this->settings['vendor']));
        }

        if (!empty($this->settings['type'])) {
            $query->whereHas('product', fn($p) => $p->where('product_type', $this->settings['type']));
        }

        $variants = $query->orderBy('id')->get();
        $total = $variants->count();

        if ($total === 0) {
            return;
        }

        $batchSize = $this->settings['batch_size'] ?? 100;

        $variants->chunk($batchSize)->each(function ($chunk) use ($shop) {
            GenerateSkuBatchJob::dispatch($shop->id, $this->settings, $chunk->pluck('id')->toArray());
        });

        Log::info("GenerateSkuJob dispatched all batches for Shop ID: {$shop->id}, total variants: {$total}");
    }
}
