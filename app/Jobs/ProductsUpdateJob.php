<?php

namespace App\Jobs;


use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

class ProductsUpdateJob
{
    use Dispatchable, InteractsWithQueue, SerializesModels;

    public $shopDomain;
    public $data;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
    }

    public function handle()
    {
        // Convert object data to array if needed (though webhook middleware usually gives array)
        // json_encode/decode handled in constructor often but let's ensure we store raw data safely
        $payload = is_array($this->data) ? $this->data : json_decode(json_encode($this->data), true);

        // buffer the update
        $item = json_encode([
            'shop' => $this->shopDomain,
            'data' => $payload
        ]);

        // buffer the update and get new length
        $len = Redis::rpush(ProcessProductUpdateBuffer::REDIS_KEY, $item);

        // Deterministic Dispatch Strategy:
        // 1. STORM: Dispatch exactly once every 50 items. This allows multiple workers to help with large queues.
        // 2. TRICKLE: If buffer is small (<50), use a Cache Lock (Throttle) to ensure we only wake up ONE worker every 5 seconds.
        //    This prevents 15 webhooks from firing 3+ jobs that find an empty buffer.
        
        if ($len % 50 === 0) {
            ProcessProductUpdateBuffer::dispatch();
        } elseif ($len < 50) {
            // Atomic check: only true if key didn't exist. "Lock" for 5 seconds.
            if (\Illuminate\Support\Facades\Cache::add('buffer_trickle_lock', true, 5)) {
                ProcessProductUpdateBuffer::dispatch();
            }
        }
    }
}
