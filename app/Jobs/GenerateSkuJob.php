<?php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\User;
use App\Jobs\GenerateSkuBatchJob;
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
        Log::info("GenerateSkuJob started for Shop ID: {$shop->id}");

        $query = Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Only apply to selected variants if provided
        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
            Log::info("Applying SKUs only to selected variant IDs: " . implode(',', $this->settings['selected_variant_ids']));
        }

        if (!empty($this->settings['only_missing'])) {
            $query->whereNull('sku');
            Log::info("Filtering only missing SKUs");
        }

        if (!empty($this->settings['vendor'])) {
            $query->whereHas('product', fn($p) => $p->where('vendor', $this->settings['vendor']));
            Log::info("Filtering by vendor: {$this->settings['vendor']}");
        }

        if (!empty($this->settings['type'])) {
            $query->whereHas('product', fn($p) => $p->where('product_type', $this->settings['type']));
            Log::info("Filtering by product type: {$this->settings['type']}");
        }

        $variants = $query->orderBy('id')->get();
        Log::info("Total variants fetched: " . $variants->count());

        $batchSize = $this->settings['batch_size'] ?? 100;

        $variants->chunk($batchSize)->each(function ($chunk, $batchIndex) use ($shop, $batchSize) {
            $batchStart = intval($this->settings['auto_start'] ?? 1) + ($batchIndex * $batchSize);
            Log::info("Dispatching batch #{$batchIndex} | batchStart: {$batchStart} | Variants in batch: " . count($chunk));
            GenerateSkuBatchJob::dispatch(
                $shop->id,
                $this->settings,
                $chunk->pluck('id')->toArray(),
                $batchStart
            );
        });

        Log::info("GenerateSkuJob completed for Shop ID: {$shop->id}");
    }
}
