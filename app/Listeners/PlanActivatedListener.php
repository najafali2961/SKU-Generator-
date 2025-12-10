<?php

namespace App\Listeners;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;

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
            $plan = $event->plan;

            if (!$shop || !$plan) return;

            Log::info('PlanActivatedListener: Applying plan', [
                'shop' => $shop->name,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name
            ]);

            $shop->shopify_freemium = 0;
            $shop->plan_id = $plan->id;
            $shop->save();

            Log::info('Plan applied successfully!', ['plan_id' => $plan->id]);
        } catch (\Exception $e) {
            Log::error('PlanActivatedListener failed', ['error' => $e->getMessage()]);
        }
    }
}
