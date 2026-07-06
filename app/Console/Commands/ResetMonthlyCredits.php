<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ResetMonthlyCredits extends Command
{
    protected $signature = 'credits:reset-monthly';

    protected $description = 'Refill monthly credit allowances for stores whose billing cycle is due (credits_reset_at <= now)';

    public function handle(): int
    {
        $due = User::query()
            ->whereNotNull('plan_id')
            ->whereNotNull('credits_reset_at')
            ->where('credits_reset_at', '<=', now())
            ->with('plan')
            ->get();

        $count = 0;

        foreach ($due as $shop) {
            try {
                $shop->resetMonthlyCredits();
                $count++;
            } catch (\Throwable $e) {
                Log::error('Monthly credit reset failed for shop', [
                    'user_id' => $shop->id,
                    'shop' => $shop->name,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Reset monthly credits for {$count} store(s).");

        return self::SUCCESS;
    }
}
