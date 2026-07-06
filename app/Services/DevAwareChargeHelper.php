<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Contracts\ShopModel as IShopModel;
use Osiset\ShopifyApp\Objects\Transfers\PlanDetails as PlanDetailsTransfer;
use Osiset\ShopifyApp\Services\ChargeHelper;
use Osiset\ShopifyApp\Storage\Models\Plan;

/**
 * Charge helper that decides test-vs-live PER STORE instead of per plan.
 *
 * Every Shopify charge (GraphQL appSubscriptionCreate for annual plans, REST
 * recurring charges otherwise) and the local `charges` record are built from
 * the transfer returned here, so this is the single choke point: development
 * stores are the ONLY stores that ever get a test charge, and every real
 * store is always billed live. The plans.test column is deliberately ignored
 * — a flipped plan flag must never test-charge (i.e. not bill) a real
 * merchant. Bound over the package's ChargeHelper in
 * AppServiceProvider::register().
 */
class DevAwareChargeHelper extends ChargeHelper
{
    public function details(Plan $plan, IShopModel $shop, string $host): PlanDetailsTransfer
    {
        $transfer = parent::details($plan, $shop, $host);

        $isDevStore = $shop instanceof User && $shop->isDevStore();
        $transfer->test = $isDevStore;

        Log::info('Billing charge mode resolved', [
            'shop' => $shop->name ?? null,
            'plan_id' => $plan->id,
            'plan_test_flag_ignored' => $plan->isTest(),
            'is_dev_store' => $isDevStore,
            'charge_test' => $transfer->test,
        ]);

        return $transfer;
    }
}
