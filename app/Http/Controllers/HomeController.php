<?php

namespace App\Http\Controllers;

use App\Models\JobLog;
use Osiset\ShopifyApp\Messaging\Jobs\WebhookInstaller;
use App\Models\User;
use Osiset\ShopifyApp\Objects\Values\ShopId;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Variant;
use Illuminate\Support\Facades\Auth;

class HomeController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $shop */
        $shop = Auth::user();

        // Base query – only variants that belong to this shop’s products
        $baseQuery = Variant::whereHas('product', fn($q) => $q->where('user_id', $shop->id));

        $stats = [
            'total_variants'         => $baseQuery->count(),

            // With SKU
            'variants_with_sku'      => (clone $baseQuery)
                ->whereNotNull('sku')
                ->where('sku', '!=', '')
                ->count(),

            // Missing SKU
            'variants_missing_sku'   => (clone $baseQuery)
                ->where(function ($q) {
                    $q->whereNull('sku')->orWhere('sku', '');
                })
                ->count(),

            // With Barcode
            'variants_with_barcode' => (clone $baseQuery)
                ->whereNotNull('barcode')
                ->where('barcode', '!=', '')
                ->count(),

            // Missing Barcode
            'variants_missing_barcode' => (clone $baseQuery)
                ->where(function ($q) {
                    $q->whereNull('barcode')->orWhere('barcode', '');
                })
                ->count(),

            'total_products'         => Product::where('user_id', $shop->id)->count(),

            // Change this to whatever makes sense for your app
            'active_stores'          => \App\Models\User::count(),
        ];

        $plan = $shop->plan;
        $planName = $plan ? $plan->name : ($shop->isFreemium() ? 'Free' : 'None');
        $monthlyCredits = $plan ? $plan->monthly_credits : 0; // Adjust as needed for freemium via config if >0

        $credits = [
            'plan_name' => $planName,
            'available' => $shop->getAvailableCredits(),
            'used' => $shop->credits_used,
            'total' => $shop->credits,
            'unlimited' => $shop->hasUnlimitedCredits(),
        ];

        return Inertia::render('Home', [
            'stats' => $stats,
            'credits' => $credits,
            'recentJobs' => JobLog::where('user_id', $shop->id)->latest()->limit(10)->get()
        ]);
    }


     public function handleShopifyCall()
    {
        $user = User::where('id',1)->first();
        // $query = <<<'GQL'
        // query {
        //   webhookSubscriptions(first: 20) {
        //     edges {
        //       node {
        //         id
        //         topic
        //         endpoint {
        //           __typename
        //           ... on WebhookHttpEndpoint {
        //             callbackUrl
        //           }
        //         }
        //       }
        //     }
        //   } 
        // }
        // GQL;
        // $query = <<<'GQL'
        // query {
        //   webhookSubscriptionsCount(query: "") {
        //     count
        //     precision
        //   } 
        // }
        // GQL;
        // $response = $this->user->api()->graph($query);
        // dd($response);
        // $this->user = User::where('id',1)->first();
        $this->installWebhooks();
    }

    public function installWebhooks()
    {
        $user = User::where('id',1)->first();
        $shopId = ShopId::fromNative($user->id);
        $webhooks = config('shopify-app.webhooks');
        // dd($webhooks);
        info("Webhooks: " . json_encode($webhooks, JSON_PRETTY_PRINT));
        WebhookInstaller::dispatch($shopId, $webhooks);
        dd("Webhooks installed");
    }

    /**
     * Giveaway Route for Support Team
     */
    public function supportAddCredits($domain)
    {
        $user = User::where('name', $domain)->first();

        if (!$user) {
            return response("Error: Store domain '{$domain}' not found in database.", 404);
        }

        // Add 5000 free credits
        $giveawayAmount = 5000;
        $user->credits_balance_history += $giveawayAmount;
        $user->save();

        return response("Success! 🎉 Added {$giveawayAmount} giveaway credits to {$user->name}. New balance: {$user->credits_balance_history} credits.");
    }
}
