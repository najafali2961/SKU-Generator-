<?php

namespace App\Listeners;

use App\Models\Plan;
use App\Models\PlanChangeLog;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;
use Carbon\Carbon;

class PlanActivatedListener implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->onQueue('default');
    }

    public function handle(PlanActivatedEvent $event)
    {
        try {
            $shop = $event->shop;

            if (!$shop) {
                Log::warning('PlanActivatedListener: No shop in event');
                return;
            }

            // Make sure we have the real User model instance
            if (!($shop instanceof User)) {
                $shopDomain = $shop->name ?? $shop->myshopify_domain ?? null;
                $shop = User::where('name', $shopDomain)->first();

                if (!$shop) {
                    Log::error('PlanActivatedListener: Shop not found in DB', ['domain' => $shopDomain]);
                    return;
                }
            }

            $plan = $event->plan;

            if (!$plan || !$plan->id) {
                Log::error('PlanActivatedListener: Invalid plan in event');
                return;
            }

            // Re-fetch plan to get all columns (monthly_credits, unlimited_credits, etc.)
            $plan = Plan::find($plan->id);

            if (!$plan) {
                Log::error('Plan not found in database', ['plan_id' => $plan?->id]);
                return;
            }

            // Snapshot the outgoing plan before we overwrite it (history).
            $previousPlan = $shop->plan_id ? Plan::find($shop->plan_id) : null;

            // Calculate credits
            $credits = $plan->unlimited_credits ? 999999 : ($plan->monthly_credits ?? 0);

            // Raw DB update — bypasses HasCredits trait, mutators, fillable, everything
            $updated = DB::table('users')->where('id', $shop->id)->update([
                'plan_id'           => $plan->id,
                'shopify_freemium'  => 0,
                'credits'           => $credits,
                'credits_used'      => 0,
                'credits_reset_at'  => Carbon::now()->addDays(30),
                'updated_at'        => Carbon::now(),
            ]);

            if ($updated) {
                // Keep a permanent record of the plan transition, including
                // whether Shopify billed it as a test or a live charge.
                $charge = $shop->charges()
                    ->where('plan_id', $plan->id)
                    ->orderByDesc('id')
                    ->first();

                PlanChangeLog::record(
                    $shop,
                    $previousPlan,
                    $plan,
                    PlanChangeLog::SOURCE_BILLING,
                    (bool) ($charge?->test ?? false),
                    $charge?->charge_id !== null ? (string) $charge->charge_id : null,
                    'Subscription activated via Shopify billing'
                );

                // Refresh model so any future code sees correct values
                $shop->refresh();

                // Notify the merchant. A plan with a trial gets the trial email;
                // otherwise a straight plan-activated confirmation.
                $trialDays = (int) ($plan->trial_days ?? 0);
                $planName = $plan->name ?? 'your';

                if ($trialDays > 0) {
                    \App\Services\EmailService::sendTrialStarted(
                        $shop,
                        $planName,
                        $trialDays,
                        Carbon::now()->addDays($trialDays)->format('M j, Y')
                    );
                } else {
                    \App\Services\EmailService::sendPlanActivated(
                        $shop,
                        $planName,
                        (int) ($plan->monthly_credits ?? 0),
                        (bool) $plan->unlimited_credits
                    );
                }
            } else {
                Log::error('No rows updated when applying plan', [
                    'user_id' => $shop->id,
                    'plan_id' => $plan->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('PlanActivatedListener failed', [
                'error'   => $e->getMessage(),
                'file'    => $e->getFile(),
                'line'    => $e->getLine(),
                'trace'   => $e->getTraceAsString(),
            ]);
        }
    }
}
