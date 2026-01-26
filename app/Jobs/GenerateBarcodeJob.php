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
            ? JobLog::find($this->jobLogId) // Changed failOrFail to find
            : JobLog::create([
                'user_id' => $shop->id,
                'type' => 'barcode_generation',
                'title' => 'Generate Barcodes',
                'description' => 'Generating barcodes for your products...',
                'payload' => $this->settings,
                'status' => 'running',
                'started_at' => now(),
            ]);

        if (!$jobLog) return;

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

        // Reserve Block ONCE
        $startCounter = $this->reserveCounterBlock($total);

        $batchSize = 100;
        $currentBatchStart = $startCounter;

        $batches = [];
        $chunks = $variants->chunk($batchSize);
        
        foreach ($chunks as $chunk) {
            $batches[] = new GenerateBarcodeBatchJob(
                $shop->id,
                $this->settings,
                $chunk->pluck('id')->toArray(),
                $currentBatchStart, 
                $jobLog->id 
            );
            $currentBatchStart += $chunk->count();
        }

        Bus::batch($batches)
            ->name("Barcode Generation - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($jobLog) {
                 $jobLog = JobLog::find($jobLog->id);
                 if($jobLog) {
                    $jobLog->update(['processed_items' => $jobLog->total_items]);
                 }
                 if($jobLog) $jobLog->markAsCompleted("Successfully generated barcodes for all variants.");
            })
            ->catch(function (Batch $batch, \Throwable $e) use ($jobLog) {
                 $jobLog = JobLog::find($jobLog->id);
                 if($jobLog) $jobLog->markAsFailed("Job failed: " . $e->getMessage());
            })
            ->dispatch();
    }

    private function reserveCounterBlock(int $count): int
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($count) {
             $format = $this->settings['format'] ?? 'UPC';
             $startNumber = (int)($this->settings['start_number'] ?? 1);

            $row = \Illuminate\Support\Facades\DB::table('barcode_counters')
                ->lockForUpdate()
                ->where('shop_id', $this->shopId)
                ->where('format', $format)
                ->first();

            if (!$row) {
                \Illuminate\Support\Facades\DB::table('barcode_counters')->insert([
                    'shop_id' => $this->shopId,
                    'format' => $format,
                    'counter' => $startNumber + $count, // Reserve full block
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return $startNumber;
            }

            $current = $row->counter + 1; // Valid next number
            \Illuminate\Support\Facades\DB::table('barcode_counters')
                ->where('id', $row->id)
                ->update(['counter' => $row->counter + $count, 'updated_at' => now()]);

            return $current;
        });
    }
}
