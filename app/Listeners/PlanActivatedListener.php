<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;
use Osiset\ShopifyApp\Storage\Models\Plan;
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
                // Refresh model so any future code sees correct values
                $shop->refresh();
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
