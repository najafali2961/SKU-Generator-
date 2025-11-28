<?php
// app/Jobs/GenerateSkuJob.php

namespace App\Jobs;

use App\Models\Variant;
use App\Models\User;
use App\Models\JobLog;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateSkuJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;
    public $settings;
    public $jobLogId;

    public function __construct($shopId, $settings, $jobLogId = null)
    {
        $this->shopId = $shopId;
        $this->settings = $settings;
        $this->jobLogId = $jobLogId;
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        if (!$shop) return;

        $jobLog = $this->jobLogId
            ? JobLog::findOrFail($this->jobLogId)
            : JobLog::create([
                'user_id' => $shop->id,
                'type' => 'sku_generation',
                'title' => 'Generate SKUs',
                'description' => 'Processing variants with your SKU settings',
                'payload' => $this->settings,
                'status' => 'pending',
            ]);

        $jobLog->markAsStarted();

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

        $variants = $query->get();
        $total = $variants->count();

        if ($total === 0) {
            $jobLog->markAsCompleted();
            return;
        }

        $jobLog->update(['total_items' => $total]);

        $batchSize = $this->settings['batch_size'] ?? 100;

        $batches = $variants->chunk($batchSize)->map(function ($chunk) use ($shop, $jobLog) {
            return new GenerateSkuBatchJob(
                $shop->id,
                $this->settings,
                $chunk->pluck('id')->toArray(),
                $jobLog->id
            );
        });

        Bus::batch($batches)
            ->then(function (Batch $batch) use ($jobLog) {
                // All jobs completed successfully
                $jobLog->markAsCompleted();
            })
            ->catch(function (Batch $batch, Throwable $e) use ($jobLog) {
                // First failed job
                $jobLog->markAsFailed($e->getMessage());
            })
            ->finally(function (Batch $batch) use ($jobLog) {
                // Always runs (optional cleanup)
            })
            ->dispatch();

        Log::info("GenerateSkuJob dispatched batch of {$total} variants for shop {$shop->id}");
    }
}
