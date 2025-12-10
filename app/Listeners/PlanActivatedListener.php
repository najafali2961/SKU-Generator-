<?php

namespace App\Listeners;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;

class PlanActivatedListener implements ShouldQueue
{
    use Queueable;

    /**
     * Create the event listener.
     */
    public function __construct()
    {
        $this->onQueue('default');
    }

    /**
     * Handle the event when a plan is activated
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
                Log::warning('PlanActivatedListener: Missing shop or plan data', [
                    'has_shop' => !is_null($shop),
                    'has_plan' => !is_null($plan),
                ]);
                return;
            }

            Log::info('PlanActivatedListener: Processing plan activation', [
                'shop_id' => $shop->id,
                'shop_name' => $shop->name,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'plan_price' => $plan->price,
                'previous_freemium' => $shop->shopify_freemium,
                'previous_plan_id' => $shop->plan_id,
            ]);

            // Update shop with new plan
            $shop->shopify_freemium = 0; // No longer on free plan
            $shop->plan_id = $plan->id;
            $shop->save();

            Log::info('PlanActivatedListener: Shop upgraded successfully', [
                'shop_id' => $shop->id,
                'shop_name' => $shop->name,
                'new_plan_id' => $plan->id,
                'new_plan_name' => $plan->name,
                'is_freemium' => $shop->shopify_freemium,
            ]);

            // You can add additional logic here:
            // - Send welcome email
            // - Grant additional features
            // - Update usage limits
            // - Log to analytics

        } catch (\Exception $e) {
            Log::error('PlanActivatedListener: Error processing plan activation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'shop_id' => $shop->id ?? 'unknown',
            ]);
        }
    }
}
