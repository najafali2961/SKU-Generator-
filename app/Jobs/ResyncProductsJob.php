<?php

namespace App\Jobs;

use App\Models\JobLog;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Coordinator for a manual product re-sync.
 *
 * Keeps the HTTP request instant: it resolves the total product count (for the
 * progress bar) and kicks off the first paginated page job. Each page job then
 * self-chains to the next page, so we stay sequential and gentle on Shopify's
 * rate limit (no parallel fan-out that could get throttled).
 */
class ResyncProductsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 120;
    public $tries = 1; // The page chain has its own retries; don't double-kick.

    public int $shopId;

    public ?int $jobLogId;

    public function __construct(int $shopId, ?int $jobLogId = null)
    {
        $this->shopId = $shopId;
        $this->jobLogId = $jobLogId;
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);
        if (!$shop) {
            $this->markFailed('Shop not found');
            return;
        }

        // Flip the mirrored JobLog to "running" (no email — markAsStarted only
        // writes an activity log).
        if ($this->jobLogId && ($log = JobLog::find($this->jobLogId))) {
            $log->markAsStarted();
        }

        try {
            // Total product count drives the "X of Y synced" display. Best-effort:
            // if it fails we just show an indeterminate count.
            $total = $this->fetchProductCount($shop);
            Redis::setex("product_sync:{$this->shopId}:total", 86400, $total);

            if ($this->jobLogId) {
                JobLog::whereKey($this->jobLogId)->update(['total_items' => $total]);
            }

            // Start the sequential page chain.
            FetchProductPageJob::dispatch($this->shopId, null, true, $this->jobLogId);
        } catch (Throwable $e) {
            Log::error('[RESYNC] coordinator failed: ' . $e->getMessage(), ['shop' => $this->shopId]);
            $this->markFailed($e->getMessage());
        }
    }

    private function fetchProductCount(User $shop): int
    {
        try {
            $resp = $shop->api()->graph('query { productsCount { count } }');
            return (int) ($resp['body']['data']['productsCount']['count'] ?? 0);
        } catch (Throwable $e) {
            Log::warning('[RESYNC] productsCount failed: ' . $e->getMessage(), ['shop' => $this->shopId]);
            return 0;
        }
    }

    private function markFailed(?string $message = null): void
    {
        Redis::setex("product_sync:{$this->shopId}:status", 86400, 'failed');
        Redis::setex("product_sync:{$this->shopId}:finished_at", 86400, now()->toIso8601String());

        // Update the mirrored JobLog directly (avoids the failure email that
        // JobLog::markAsFailed() would send for every internal sync).
        if ($this->jobLogId && ($log = JobLog::find($this->jobLogId))) {
            $log->update([
                'status' => 'failed',
                'error_message' => $message,
                'finished_at' => now(),
            ]);
            $log->error('Sync failed', $message ?? 'Unknown error occurred');
        }
    }

    public function failed(Throwable $e): void
    {
        $this->markFailed($e->getMessage());
    }
}
