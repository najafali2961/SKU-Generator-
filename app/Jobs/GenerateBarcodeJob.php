<?php

namespace App\Jobs;

use App\Models\JobLog;
use App\Models\User;
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
        $this->onQueue('default');
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        if (!$shop)
            return;

        $jobLog = $this->jobLogId
            ? JobLog::find($this->jobLogId)  // Changed failOrFail to find
            : JobLog::create([
                'user_id' => $shop->id,
                'type' => 'barcode_generation',
                'title' => 'Generate Barcodes',
                'description' => 'Generating barcodes for your products...',
                'payload' => $this->settings,
                'status' => 'running',
                'started_at' => now(),
            ]);

        if (!$jobLog)
            return;

        $jobLog->update(['status' => 'running']);

        $query = \App\Models\Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
        } else {
            // Apply Scope based on Active Tab if no specific IDs selected
            $tab = $this->settings['active_tab'] ?? 'all';

            if ($tab === 'missing') {
                $query->where(function ($q) {
                    $q
                        ->whereNull('barcode')
                        ->orWhere('barcode', '')
                        ->orWhere('barcode', '-');
                });
            } elseif ($tab === 'duplicates') {
                // Subquery for duplicate barcodes
                $dupBarcodes = \App\Models\Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id))
                    ->select('barcode')
                    ->whereNotNull('barcode')
                    ->where('barcode', '<>', '')
                    ->where('barcode', '<>', '-')
                    ->groupBy('barcode')
                    ->havingRaw('count(*) > 1');

                $query->whereIn('barcode', $dupBarcodes);
            }

            // Apply Filters (only if not selecting specific IDs)
            if (!empty($this->settings['vendor'])) {
                $query->whereHas('product', fn($p) => $p->where('vendor', $this->settings['vendor']));
            }
            if (!empty($this->settings['type'])) {
                $query->whereHas('product', fn($p) => $p->where('product_type', $this->settings['type']));
            }
            if (!empty($this->settings['search'])) {
                $term = trim($this->settings['search']);
                $query->where(function ($q) use ($term) {
                    $q
                        ->where('barcode', 'like', "%{$term}%")
                        ->orWhere('sku', 'like', "%{$term}%")
                        ->orWhere('title', 'like', "%{$term}%")
                        ->orWhereHas('product', function ($pq) use ($term) {
                            $pq->where('title', 'like', "%{$term}%");
                        });
                });
            }
            if (!empty($this->settings['collections'])) {
                $cIds = array_filter($this->settings['collections']);
                if (count($cIds) > 0) {
                    $query->whereHas('product.collections', fn($q) => $q->whereIn('collection_id', $cIds));
                }
            }
            if (!empty($this->settings['tags'])) {
                $tags = $this->settings['tags'];
                if (is_string($tags))
                    $tags = explode(',', $tags);
                $tags = array_filter($tags);
                if (count($tags) > 0) {
                    $query->whereHas('product', function ($q) use ($tags) {
                        foreach ($tags as $t)
                            $q->where('tags', 'LIKE', '%' . trim($t) . '%');
                    });
                }
            }
        }

        $total = $query->count();

        if ($total === 0) {
            $jobLog->markAsCompleted('No variants matched the criteria.');
            return;
        }

        $jobLog->update(['total_items' => $total]);

        // Reserve Block ONCE
        $startCounter = $this->reserveCounterBlock($total);

        $batchSize = 100;
        $currentBatchStart = $startCounter;

        $batches = [];
        // Optimize: Pluck IDs directly
        $allVariantIds = $query->pluck('id');
        $chunks = $allVariantIds->chunk($batchSize);

        foreach ($chunks as $chunk) {
            $batches[] = new GenerateBarcodeBatchJob(
                $shop->id,
                $this->settings,
                $chunk->toArray(),
                $currentBatchStart,
                $jobLog->id
            );
            $currentBatchStart += $chunk->count();
        }

        Bus::batch($batches)
            ->name("Barcode Generation - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($jobLog) {
                $jobLog = JobLog::find($jobLog->id);

                // Get accurate counts from Redis
                $redisKeyProcessed = "job_progress_{$jobLog->id}";
                $redisKeyFailed = "job_failed_{$jobLog->id}";
                $processed = (int) \Illuminate\Support\Facades\Redis::get($redisKeyProcessed);
                $failed = (int) \Illuminate\Support\Facades\Redis::get($redisKeyFailed);

                if ($jobLog) {
                    $jobLog->update(['processed_items' => $jobLog->total_items]);
                }
                if ($jobLog)
                    $jobLog->markAsCompleted();  // Fixed: remove argument
            })
            ->catch(function (Batch $batch, \Throwable $e) use ($jobLog) {
                $jobLog = JobLog::find($jobLog->id);
                if ($jobLog)
                    $jobLog->markAsFailed('Job failed: ' . $e->getMessage());
                Log::error('Barcode Batch Job Failed Entirely', ['error' => $e->getMessage()]);
            })
            ->dispatch();
    }

    private function reserveCounterBlock(int $count): int
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($count) {
            $format = $this->settings['format'] ?? 'UPC';
            $startNumber = (int) ($this->settings['start_number'] ?? 1);

            $row = \Illuminate\Support\Facades\DB::table('barcode_counters')
                ->lockForUpdate()
                ->where('shop_id', $this->shopId)
                ->where('format', $format)
                ->first();

            if (!$row) {
                \Illuminate\Support\Facades\DB::table('barcode_counters')->insert([
                    'shop_id' => $this->shopId,
                    'format' => $format,
                    'counter' => $startNumber + $count,  // Reserve full block
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return $startNumber;
            }

            // Fix: If user has explicitly provided a start number in the settings,
            // we should respect it and RESET the counter to that number.
            // The frontend now sends the *current* next number if untouched,
            // so we can trust `startNumber` from settings as the base.

            // Logic:
            // 1. Use `startNumber` from settings as the starting point for this batch.
            // 2. Update DB counter to `startNumber + count`.

            $start = $startNumber;  // Confirmed to be set in handle() from settings

            \Illuminate\Support\Facades\DB::table('barcode_counters')
                ->where('id', $row->id)
                ->update(['counter' => $start + $count - 1, 'updated_at' => now()]);

            return $start;
        });
    }
}
