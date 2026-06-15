<?php

namespace App\Http\Controllers;

use App\Jobs\ResyncProductsJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redis;

class SyncController extends Controller
{
    /**
     * Manually re-pull all products/variants from Shopify.
     *
     * Used when webhooks were missed and the local DB has drifted (e.g. a
     * variant was deleted on Shopify but still exists locally and sits stuck in
     * the "Missing" tab). The HTTP request stays instant — it only flips the
     * status flag and hands the work to a queued job — so it is safe under
     * Octane.
     */
    public function start(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        // Don't start a second sync on top of a running one.
        if (Redis::get($this->key($shop->id, 'status')) === 'running') {
            return $this->status($request);
        }

        // Reset counters and mark running (TTL self-heals a crashed sync).
        Redis::setex($this->key($shop->id, 'status'), 3600, 'running');
        Redis::setex($this->key($shop->id, 'processed'), 86400, 0);
        Redis::del($this->key($shop->id, 'total'));
        Redis::del($this->key($shop->id, 'finished_at'));

        ResyncProductsJob::dispatch($shop->id);

        return $this->status($request);
    }

    /**
     * Lightweight polling endpoint for the sync widget.
     */
    public function status(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();
        $id = $shop->id;

        $status    = Redis::get($this->key($id, 'status')) ?: 'idle';
        $processed = (int) Redis::get($this->key($id, 'processed'));
        $total     = (int) Redis::get($this->key($id, 'total'));
        $percent   = $total > 0
            ? min(100, (int) floor(($processed / $total) * 100))
            : ($status === 'running' ? 0 : 100);

        return response()->json([
            'status'      => $status,                  // idle | running | completed | failed
            'running'     => $status === 'running',
            'processed'   => $processed,
            'total'       => $total,
            'percent'     => $percent,
            'finished_at' => Redis::get($this->key($id, 'finished_at')),
        ]);
    }

    private function key(int $shopId, string $suffix): string
    {
        return "product_sync:{$shopId}:{$suffix}";
    }
}
