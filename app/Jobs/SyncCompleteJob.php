<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncCompleteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;

    public function __construct($shopId)
    {
        $this->shopId = $shopId;
    }

    public function handle(): void
    {
        // No-op placeholder. Dispatched at the end of the full sync chain so
        // downstream listeners or future post-sync hooks have a single signal.
    }
}
