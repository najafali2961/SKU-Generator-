<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcasts the "free credits updated" email to every active merchant.
 * Triggered when an admin changes the `free_plan_credits` setting.
 */
class NotifyFreeCreditsUpdatedJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $credits)
    {
    }

    public function handle(): void
    {
        // Eager-load store details so recipient resolution stays cheap.
        User::with('storeDetails')
            ->chunkById(200, function ($users) {
                foreach ($users as $user) {
                    EmailService::sendFreeCreditsUpdated($user, $this->credits);
                }
            });
    }
}
