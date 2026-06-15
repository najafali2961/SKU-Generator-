<?php

namespace App\Jobs;

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

    public function __construct(int $shopId)
    {
        $this->shopId = $shopId;
        $this->onQueue('default');
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);
        if (!$shop) {
            $this->markFailed();
            return;
        }

        try {
            // Total product count drives the "X of Y synced" display. Best-effort:
            // if it fails we just show an indeterminate count.
            Redis::setex("product_sync:{$this->shopId}:total", 86400, $this->fetchProductCount($shop));

            // Start the sequential page chain.
            FetchProductPageJob::dispatch($this->shopId, null, true);
        } catch (Throwable $e) {
            Log::error('[RESYNC] coordinator failed: ' . $e->getMessage(), ['shop' => $this->shopId]);
            $this->markFailed();
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

    private function markFailed(): void
    {
        Redis::setex("product_sync:{$this->shopId}:status", 86400, 'failed');
        Redis::setex("product_sync:{$this->shopId}:finished_at", 86400, now()->toIso8601String());
    }

    public function failed(Throwable $e): void
    {
        $this->markFailed();
    }
}
