<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\PlanChangeLog;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Console\Command;

/**
 * One-time paid-launch baseline: puts every installed shop on the Free tier
 * with a clean credit balance, wiping ad-hoc balances/bonuses accumulated
 * while the app was free. Writes a plan_change_logs audit row per shop.
 */
class BillingLaunchReset extends Command
{
    protected $signature = 'billing:launch-reset';

    protected $description = 'Reset every installed shop to the Free tier baseline for the paid launch (credits from free_plan_credits, usage zeroed, audit rows written)';

    public function handle(): int
    {
        $freeCredits = (int) Setting::getValue('free_plan_credits', 500);

        $shops = User::whereNull('deleted_at')->with('plan')->get();
        $count = $shops->count();
        $withPlans = $shops->whereNotNull('plan_id')->count();

        if ($count === 0) {
            $this->info('No installed shops found — nothing to reset.');

            return self::SUCCESS;
        }

        $summary = "This puts {$count} shop(s) on the Free plan ({$freeCredits} credits / 30 days), zeroes their usage, and clears every credit override/bonus.";
        if ($withPlans > 0) {
            $summary .= " {$withPlans} shop(s) currently have a plan assigned — it will be removed locally (cancel any live Shopify charge from Admin → Store Details if one exists).";
        }

        if (! $this->confirm($summary . ' Continue?')) {
            $this->info('Aborted. Nothing changed.');

            return self::SUCCESS;
        }

        $reset = 0;

        foreach ($shops as $shop) {
            $previousPlan = $shop->plan_id ? ($shop->plan ?? Plan::find($shop->plan_id)) : null;

            PlanChangeLog::record(
                $shop,
                $previousPlan,
                null,
                PlanChangeLog::SOURCE_LAUNCH_RESET,
                notes: "Paid-launch baseline: credits set to {$freeCredits}, usage zeroed (was {$shop->credits}/{$shop->credits_used})"
            );

            $shop->forceFill([
                'plan_id' => null,
                'shopify_freemium' => 1,
                'credits' => $freeCredits,
                'credits_used' => 0,
                'credits_reset_at' => now()->addDays(30),
            ])->save();

            $reset++;
        }

        $this->info("Done: {$reset} shop(s) reset to the Free plan with fresh credit cycles. Audit rows written to plan_change_logs (source: launch_reset).");

        return self::SUCCESS;
    }
}
