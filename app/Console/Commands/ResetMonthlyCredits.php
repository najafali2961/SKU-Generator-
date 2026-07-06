<?php

namespace App\Console\Commands;

use App\Models\CreditUsageLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ResetMonthlyCredits extends Command
{
    protected $signature = 'credits:reset-monthly';

    protected $description = 'Refill credit allowances for stores whose 30-day cycle is due (paid plans get plan credits, the Free plan gets free_plan_credits)';

    public function handle(): int
    {
        $due = User::query()
            ->whereNull('deleted_at')
            ->whereNotNull('credits_reset_at')
            ->where('credits_reset_at', '<=', now())
            ->with('plan')
            ->get();

        $paid = 0;
        $free = 0;
        $freeCredits = (int) Setting::getValue('free_plan_credits', 500);

        foreach ($due as $shop) {
            try {
                if ($shop->plan_id && $shop->plan) {
                    // Paid plan: full reset via the trait (also emails).
                    $shop->resetMonthlyCredits();
                    $paid++;
                } else {
                    // Free plan: refill quietly (no monthly email spam).
                    $before = $shop->credits;
                    $shop->forceFill([
                        'credits' => $freeCredits,
                        'credits_used' => 0,
                        'credits_reset_at' => now()->addDays(30),
                    ])->save();

                    CreditUsageLog::create([
                        'user_id' => $shop->id,
                        'feature' => 'monthly_reset',
                        'credits_used' => 0,
                        'credits_before' => $before,
                        'credits_after' => $freeCredits,
                        'description' => 'Free plan monthly credit reset',
                        'metadata' => ['plan' => 'free'],
                    ]);
                    $free++;
                }
            } catch (\Throwable $e) {
                Log::error('Monthly credit reset failed for shop', [
                    'user_id' => $shop->id,
                    'shop' => $shop->name,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Reset monthly credits: {$paid} paid store(s), {$free} free store(s).");

        return self::SUCCESS;
    }
}
