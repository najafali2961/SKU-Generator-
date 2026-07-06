<?php

namespace App\Console\Commands;

use App\Models\Plan;
use App\Models\Setting;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Console\Command;

/**
 * Queues the one-time paid-launch announcement email to every installed shop
 * that hasn't received it yet. Use --test-to=you@example.com to preview the
 * email without marking anyone as notified.
 */
class BillingAnnounceLaunch extends Command
{
    protected $signature = 'billing:announce-launch {--test-to= : Send a preview to this address only (no shops are marked as notified)}';

    protected $description = 'Queue the paid-launch announcement email to all installed shops (one-time, tracked via users.launch_announced_at)';

    public function handle(): int
    {
        $freeCredits = (int) Setting::getValue('free_plan_credits', 500);
        $plans = $this->planTable();

        if ($testTo = $this->option('test-to')) {
            EmailService::sendPaidLaunch(null, $freeCredits, $plans, $testTo);
            $this->info("Preview sent to {$testTo}. No shops were marked as notified.");

            return self::SUCCESS;
        }

        $pending = User::whereNull('deleted_at')
            ->whereNull('launch_announced_at')
            ->count();

        if ($pending === 0) {
            $this->info('Every installed shop has already been notified — nothing to send.');

            return self::SUCCESS;
        }

        if (! $this->confirm("Queue the paid-launch announcement email to {$pending} shop(s)?")) {
            $this->info('Aborted. Nothing sent.');

            return self::SUCCESS;
        }

        $queued = 0;

        User::with('storeDetails')
            ->whereNull('deleted_at')
            ->whereNull('launch_announced_at')
            ->chunkById(200, function ($shops) use ($freeCredits, $plans, &$queued) {
                foreach ($shops as $shop) {
                    EmailService::sendPaidLaunch($shop, $freeCredits, $plans);
                    $shop->forceFill(['launch_announced_at' => now()])->save();
                    $queued++;
                }
            });

        $this->info("Done: {$queued} email(s) queued.");

        return self::SUCCESS;
    }

    /**
     * Visible monthly plans as rows for the email's pricing table.
     *
     * @return array<int, array{name: string, credits: string, price: string}>
     */
    protected function planTable(): array
    {
        return Plan::where('is_visible', true)
            ->where('name', 'not like', 'Custom Plan (%')
            ->where('interval', 'EVERY_30_DAYS')
            ->orderBy('price')
            ->get()
            ->map(fn (Plan $plan) => [
                'name' => $plan->name,
                'credits' => $plan->unlimited_credits ? 'Unlimited' : number_format((int) $plan->monthly_credits),
                'price' => '$' . number_format((float) $plan->price, 2) . '/mo',
            ])
            ->all();
    }
}
