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
        $this->onQueue('default');
    }

    public function handle()
    {
        $shop = User::find($this->shopId);
        if (!$shop) return;

        $jobLog = $this->jobLogId
            ? JobLog::find($this->jobLogId)
            : JobLog::create([
                'user_id' => $shop->id,
                'type' => 'sku_generation',
                'title' => 'Generate SKUs',
                'description' => 'Processing variants with your SKU settings',
                'payload' => $this->settings,
                'status' => 'pending',
            ]);
        
        // Ensure we have a valid job log instance
        if(!$jobLog) return;

        $jobLog->markAsStarted();

        $query = Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        if (!empty($this->settings['selected_variant_ids'])) {
            $query->whereIn('id', $this->settings['selected_variant_ids']);
        } else {
            // Scope Logic
            $tab = $this->settings['active_tab'] ?? 'all';
            
            if ($tab === 'missing') {
                $query->where(function($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                });
            } elseif ($tab === 'duplicates') {
                 // Identify duplicate SKUs
                 $dupSkus = \App\Models\Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id))
                    ->select('sku')
                    ->whereNotNull('sku')
                    ->where('sku', '<>', '')
                    ->groupBy('sku')
                    ->havingRaw('count(*) > 1');

                 $query->whereIn('sku', $dupSkus);
            }
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
        if (!empty($this->settings['search'])) {
            $term = trim($this->settings['search']);
            $query->where(function ($q) use ($term) {
                $q->where('sku', 'like', "%{$term}%")
                  ->orWhere('title', 'like', "%{$term}%")
                  ->orWhereHas('product', function ($pq) use ($term) {
                      $pq->where('title', 'like', "%{$term}%");
                  });
            });
        }

        $total = $query->count();

        if ($total === 0) {
            $jobLog->markAsCompleted();
            return;
        }

        $jobLog->update(['total_items' => $total]);

        // Reserve Block ONCE for the entire job
        $startCounter = $this->reserveCounterBlock($total);

        $batchSize = $this->settings['batch_size'] ?? 100;
        $currentBatchStart = $startCounter;

        $batches = [];
        // Optimize: Pluck IDs directly to save memory
        $allVariantIds = $query->pluck('id');
        $chunks = $allVariantIds->chunk($batchSize);

        foreach ($chunks as $chunk) {
            $batches[] = new GenerateSkuBatchJob(
                $shop->id,
                $this->settings,
                $chunk->toArray(),
                $currentBatchStart, // Pass the pre-calculated start counter
                $jobLog->id
            );
            $currentBatchStart += $chunk->count();
        }



        Bus::batch($batches)
            ->name("SKU Generation - Shop {$shop->id}")
            ->then(function (Batch $batch) use ($jobLog) {
                $jobLog = JobLog::find($jobLog->id);

                if (!$jobLog) {
                    Log::error("SKU Job Completion: JobLog not found");
                    return;
                }

                // Report the REAL number of variants synced — not the total —
                // so the UI no longer shows 100% while some SKUs stay missing.
                $processed = (int) \Illuminate\Support\Facades\Redis::get("job_progress_{$jobLog->id}");
                $failed    = (int) \Illuminate\Support\Facades\Redis::get("job_failed_{$jobLog->id}");

                $jobLog->update([
                    'processed_items' => $processed,
                    'failed_items'    => $failed,
                ]);

                if ($failed > 0) {
                    $jobLog->activityLogs()->create([
                        'level' => 'warning',
                        'title' => 'Completed with warnings',
                        'message' => "Synced {$processed} variant(s). {$failed} could not be synced to Shopify and remain unchanged — re-run to retry them.",
                        'logged_at' => now(),
                    ]);
                }

                $jobLog->markAsCompleted();
            })
            ->catch(function (Batch $batch, Throwable $e) use ($jobLog) {
                // First failed job
                $jobLog = JobLog::find($jobLog->id);
                if ($jobLog) $jobLog->markAsFailed($e->getMessage());
                
                Log::error("SKU Batch Job Failed Entirely", ['error' => $e->getMessage()]);
            })
            ->dispatch();
    }

    private function reserveCounterBlock(int $count): int
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($count) {
            $row = \Illuminate\Support\Facades\DB::table('sku_counters')
                ->lockForUpdate()
                ->where('shop_id', $this->shopId)
                ->whereNull('product_id')
                ->first();

            $start = $this->settings['auto_start'] ?? 1;

            if (!$row) {
                \Illuminate\Support\Facades\DB::table('sku_counters')->insert([
                    'shop_id' => $this->shopId,
                    'product_id' => null,
                    'counter' => $start + $count, // Reserve full block
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return $start;
            }

            // Fix: If user has explicitly provided a start number in the settings,
            // we should respect it and RESET/JUMP the counter to that number.
            // But we must be careful not to reset it if it's just the default "0001" and hasn't changed.
            // HOWEVER, the frontend now sends the *current* next number as "auto_start" if untouched.
            // So if `auto_start` > `current_counter`, it's a jump forward (safe).
            // If `auto_start` < `current_counter`, it's a reset (user action).
            // WE SHOULD TRUST THE INPUT `auto_start` if it differs from expected next.
            
            // Actually, simpler logic: 
            // If the user passed an `auto_start`, we use it as the base for this batch.
            // And we update the DB counter to `auto_start + count`.
            // This allows resets (e.g. back to 1) and jumps.
            
            // We use the `auto_start` from settings if present, otherwise fall back to row counter + 1.
            // NOTE: `auto_start` is always sent by frontend now.
            
            $start = $this->settings['auto_start'] ?? ($row->counter + 1);
            $start = (int)$start;

            \Illuminate\Support\Facades\DB::table('sku_counters')
                ->where('id', $row->id)
                ->update(['counter' => $start + $count - 1, 'updated_at' => now()]); // counter is the LAST used number

            return $start;
        });
    }
}
