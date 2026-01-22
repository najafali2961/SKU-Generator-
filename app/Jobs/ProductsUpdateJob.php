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
        // 1. STORM: Dispatch exactly once every 50 items (Modulo).
        // 2. TRICKLE: If buffer is small (<50), dispatch occasionally (10% chance) to ensure clean-up.
        
        if ($len % 50 === 0) {
            ProcessProductUpdateBuffer::dispatch();
        } elseif ($len < 50 && rand(1, 10) === 1) {
            ProcessProductUpdateBuffer::dispatch();
        }
    }
}
