<?php

namespace App\Jobs;

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

class GenerateBarcodeJob implements ShouldQueue
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
                'type' => 'barcode_generation',
                'title' => 'Generate Barcodes',
                'description' => 'Generating barcodes for your products...',
                'payload' => $this->settings,
                'status' => 'running',
                'started_at' => now(),
            ]);

        $jobLog->update(['status' => 'running']);

        $query = \App\Models\Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
        }

        $variants = $query->get();
        $total = $variants->count();

        if ($total === 0) {
            $jobLog->markAsCompleted("No variants matched the criteria.");
            return;
        }

        $jobLog->update(['total_items' => $total]);

        $batchSize = 100;
        $batches = $variants->chunk($batchSize)->map(function ($chunk) use ($shop, $jobLog) {
            return new GenerateBarcodeBatchJob(
                $shop->id,
                $this->settings,
                $chunk->pluck('id')->toArray(),
                $jobLog->id
            );
        });

        Bus::batch($batches)
            ->name("Barcode Generation - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($jobLog) {
                $jobLog->markAsCompleted("Successfully generated barcodes for all variants.");
            })
            ->catch(function (Batch $batch, \Throwable $e) use ($jobLog) {
                $jobLog->markAsFailed("Job failed: " . $e->getMessage());
            })
            ->dispatch();

        Log::info("Barcode generation batch dispatched for shop {$shop->id}, {$total} variants");
    }
}
