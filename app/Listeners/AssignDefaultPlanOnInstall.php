<?php

namespace App\Listeners;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Osiset\ShopifyApp\Messaging\Events\AppInstalledEvent;
use Osiset\ShopifyApp\Messaging\Events\ShopAuthenticatedEvent;
use Illuminate\Support\Facades\Log;

class AssignDefaultPlanOnInstall implements ShouldQueue
{
    use Queueable;

    /**
     * Handle app installation - assign freemium plan on install
     *
     * @param  AppInstalledEvent  $event
     * @return void
     */
    public function handle(AppInstalledEvent $event)
    {
        try {
            // Get the shop ID from the event (convert ShopId object to string)
            $shopId = $event->shopId->toNative();

            if (!$shopId) {
                Log::warning('No shop ID found in AppInstalledEvent');
                return;
            }

            // Get the shop from the database using the shop ID
            $shop = \App\Models\User::find($shopId);

            if (!$shop) {
                Log::warning('Shop not found in database', ['shop_id' => $shopId]);
                return;
            }

            Log::info('Processing AppInstalledEvent for shop', [
                'shop_id' => $shop->id,
                'shop_name' => $shop->name,
            ]);

            // Set freemium on install (no plan needed)
            $shop->shopify_freemium = true;
            $shop->save();

            Log::info('Shop set to freemium on install', [
                'shop' => $shop->name,
                'shop_id' => $shop->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in AssignDefaultPlanOnInstall: ' . $e->getMessage(), [
                'exception' => get_class($e),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
