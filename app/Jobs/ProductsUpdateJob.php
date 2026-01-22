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

        Redis::rpush(ProcessProductUpdateBuffer::REDIS_KEY, $item);

        // Attempt to trigger the processor
        // We use dispatchAfterResponse to avoid slowing down the webhook acknowledgment
        // Or standard dispatch. 
        // Logic: if we dispatch every time, we still flood the queue with "Check Buffer" jobs.
        // Optimization: Only dispatch if queue is likely empty or periodically?
        // Safest for now: Dispatch. But simple dispatch might just add 2000 jobs to queue again.
        // 
        // BETTER PATTERN: 
        // Don't dispatch here if you have a schedule. 
        // BUT user expects "near realtime".
        // 
        // COMPROMISE:
        // Dispatch ProcessProductUpdateBuffer. 
        // But ProcessProductUpdateBuffer uses 'WithoutOverlapping'.
        // So 1999 jobs will be released/ignored? No, WithoutOverlapping acts on the *execution*.
        // If we dispatch 2000 times, we get 2000 jobs in queue.
        // 
        // SOLUTION:
        // We assume Supervisor/Horizon is running `ProcessProductUpdateBuffer` or we dispatch it "uniquely".
        // Laravel's `uniqueId` job middleware? 
        // Or just let the first one run and loop?
        // 
        // Let's rely on the Processor looping until empty.
        // We only need to wake it up.
        // 
        // To avoid flooding the queue with 2000 wake-up calls:
        // We can check if a "processor" job is already in queue? Hard.
        // 
        // Let's just Push to Redis. 
        // And dispatch the processor ONLY if we think it's necessary.
        // Or Dispatch and let Laravel handle it. Use a cache lock to throttle dispatches?
        
        // Optimizing "Wake Up" calls:
        // Only dispatch the processor roughly once every 50 webhooks.
        // This keeps the buffer flow moving without spamming the queue system with "Check Buffer" jobs.
        // 2000 webhooks -> ~40 dispatch calls.
        
        if (rand(1, 50) === 1) {
            ProcessProductUpdateBuffer::dispatch();
        }
    }
}
