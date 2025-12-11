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
        if (!$shop) {
            Log::error('Shop not found', ['shop_id' => $this->shopId]);
            return;
        }

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

        // Build query
        $query = \App\Models\Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        // Apply scope filter
        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
        } else {
            // Apply other filters for "all" scope
            $this->applyFilters($query, $this->settings);
        }

        $variants = $query->get();
        $total = $variants->count();

        if ($total === 0) {
            $jobLog->markAsCompleted("No variants matched the criteria.");
            return;
        }

        // ✅ FINAL CREDIT CHECK BEFORE PROCESSING
        $validation = $shop->validateCreditsForOperation('barcode_generation', $total);

        if (!$validation['can_proceed']) {
            $jobLog->markAsFailed($validation['message']);
            Log::error('Insufficient credits for barcode generation', [
                'user_id' => $shop->id,
                'required' => $validation['required'],
                'available' => $validation['available'],
                'max_allowed' => $validation['max_allowed'],
            ]);
            return;
        }

        $jobLog->update(['total_items' => $total]);

        // Split into batches
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
            ->then(function (Batch $batch) use ($jobLog, $shop, $total) {
                // ✅ DEDUCT CREDITS AFTER SUCCESSFUL COMPLETION
                $actualProcessed = $jobLog->processed_items ?? $total;

                $shop->useCredits(
                    'barcode_generation',
                    $actualProcessed,
                    "Generated {$actualProcessed} barcode(s)",
                    [
                        'job_log_id' => $jobLog->id,
                        'format' => $this->settings['format'] ?? 'UPC',
                        'batch_id' => $batch->id,
                    ]
                );

                $jobLog->markAsCompleted("Successfully generated barcodes for {$actualProcessed} variant(s).");

                Log::info('Barcode generation completed', [
                    'user_id' => $shop->id,
                    'processed' => $actualProcessed,
                    'credits_used' => $shop->getCreditCost('barcode_generation', $actualProcessed),
                    'credits_remaining' => $shop->getAvailableCredits(),
                ]);
            })
            ->catch(function (Batch $batch, \Throwable $e) use ($jobLog) {
                $jobLog->markAsFailed("Job failed: " . $e->getMessage());
                Log::error('Barcode generation batch failed', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            })
            ->dispatch();

        Log::info("Barcode generation batch dispatched", [
            'shop_id' => $shop->id,
            'total_variants' => $total,
            'batches' => $batches->count(),
        ]);
    }

    private function applyFilters($query, $settings)
    {
        if (!empty($settings['vendor'])) {
            $query->whereHas('product', fn($q) => $q->where('vendor', 'like', '%' . $settings['vendor'] . '%'));
        }

        if (!empty($settings['type'])) {
            $query->whereHas('product', fn($q) => $q->where('product_type', 'like', '%' . $settings['type'] . '%'));
        }

        if (!empty($settings['collections']) && is_array($settings['collections'])) {
            $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $settings['collections']));
        }

        if (!empty($settings['tags'])) {
            $tags = is_array($settings['tags']) ? $settings['tags'] : explode(',', $settings['tags']);
            $tags = array_filter(array_map('trim', $tags));

            if (count($tags) > 0) {
                $query->whereHas('product', function ($q) use ($tags) {
                    foreach ($tags as $tag) {
                        $q->where('tags', 'LIKE', '%' . $tag . '%');
                    }
                });
            }
        }
    }
}
