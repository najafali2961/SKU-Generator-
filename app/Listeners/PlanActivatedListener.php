<?php

namespace App\Listeners;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;
use Illuminate\Support\Facades\Log;

class PlanActivatedListener implements ShouldQueue
{
    use Queueable;

    /**
     * Handle plan activation when user upgrades
     *
     * @param  PlanActivatedEvent  $event
     * @return void
     */
    public function handle(PlanActivatedEvent $event)
    {
        try {
            $shop = $event->shop;
            $plan = $event->plan;

            if (!$shop || !$plan) {
                Log::warning('Missing shop or plan in PlanActivatedEvent');
                return;
            }

            Log::info('Plan activated for shop', [
                'shop_id' => $shop->id,
                'shop_name' => $shop->name,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);

            // Update shop to no longer use freemium (now has a paid plan)
            $shop->freemium = false;
            $shop->plan_id = $plan->id;
            $shop->save();

            Log::info('Shop upgraded from freemium to paid plan', [
                'shop' => $shop->name,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in PlanActivatedListener: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
