<?php

namespace App\Jobs;

use App\Models\StoreDetail;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\Modules\SharedService;

class AfterAuthenticateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $shop;

    /**
     * Create a new job instance.
     */
    public function __construct($shop)
    {
        $this->shop = $shop;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $storeDetails = app(\App\Services\StoreDetailService::class)->sync($this->shop);

        if ($storeDetails) {
            \App\Jobs\CheckShopRestrictedKeywordsJob::dispatch($this->shop);
        }
    }
}