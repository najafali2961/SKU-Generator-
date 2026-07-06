<?php

namespace App\Http\Controllers;

use App\Models\JobLog;
use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Variant;
use App\Models\StoreDetail;
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

        $credits = [
            'plan_name' => $planName,
            // Monthly allowance: plan credits for subscribers, the free
            // starting credits for freemium stores (was hardcoded 0).
            'monthly' => $plan
                ? (int) $plan->monthly_credits
                : (int) \App\Models\Setting::getValue('free_plan_credits', 500),
            'available' => $shop->hasUnlimitedCredits() ? null : $shop->getAvailableCredits(),
            'used' => $shop->credits_used,
            'total' => $shop->credits,
            'unlimited' => $shop->hasUnlimitedCredits(),
            'next_reset_at' => $shop->plan_id ? $shop->credits_reset_at?->toIso8601String() : null,
        ];

        return Inertia::render('Home', [
            'stats' => $stats,
            'credits' => $credits,
            'recentJobs' => JobLog::where('user_id', $shop->id)->latest()->limit(10)->get(),
            'has_claimed_giveaway' => (bool) $shop->has_claimed_giveaway,
            'giveaway_credits' => (int) \App\Models\Setting::getValue('giveaway_credits', 500),
        ]);
    }

    /**
     * Giveaway Route for Support Team — one-shot per store, amount comes from
     * the admin "giveaway_credits" setting, grant is written through
     * addCredits() so it lands in the credit usage log.
     */
    public function supportAddCredits($domain)
    {
        $user = $this->resolveShopByDomain($domain);

        if (!$user) {
            return response("Error: Store domain '{$domain}' not found in database.", 404);
        }

        // Atomic one-shot claim: the guarded UPDATE flips the flag only if it
        // is still unset, so concurrent requests can't double-grant.
        $claimed = User::whereKey($user->id)
            ->where('has_claimed_giveaway', false)
            ->update(['has_claimed_giveaway' => true]);

        if (!$claimed) {
            return response("Error: Store '{$domain}' has already claimed the giveaway.", 400);
        }

        $giveawayAmount = (int) \App\Models\Setting::getValue('giveaway_credits', 500);

        $user->refresh();
        $user->addCredits($giveawayAmount, 'Support giveaway');

        \App\Services\EmailService::sendCreditsAdded($user, 'giveaway', $giveawayAmount, (int) $user->credits);

        return response("Success! 🎉 Added {$giveawayAmount} giveaway credits to {$user->name}. New total credits: {$user->credits}.");
    }

    /**
     * Support Route: Give custom credits to a store (separate from giveaway).
     * Works with a plain URL so agents can use it directly from chat, exactly
     * as before. Optionally, setting a "Support grant key" in Credit Settings
     * makes ?key=... required on this link.
     */
    public function supportGiveCredits(Request $request, $domain, $credits)
    {
        $supportKey = (string) \App\Models\Setting::getValue('support_giveaway_key', '');

        if ($supportKey !== '' && ! hash_equals($supportKey, (string) $request->query('key', ''))) {
            return response("Error: Invalid or missing support key.", 403);
        }

        $credits = (int) $credits;

        if ($credits <= 0) {
            return response("Error: Credits must be a positive number.", 400);
        }

        $user = $this->resolveShopByDomain($domain);

        if (!$user) {
            return response("Error: Store domain '{$domain}' not found in database.", 404);
        }

        $user->addCredits($credits, 'Support credit grant');

        return response("Success! ✅ Added {$credits} credits to {$user->name}. New total credits: {$user->credits}.");
    }

    /**
     * Resolve a shop from whatever domain a support giveaway link carries.
     *
     * The Crisp giveaway link is built from the store's primary/custom domain
     * (e.g. coyotemoondesignco.com) when one exists, but the .myshopify.com
     * domain lives on users.name — so a plain name lookup 404s for every store
     * with a custom domain. Match the myshopify domain first, then fall back to
     * the custom/primary domain stored on store_details.
     */
    private function resolveShopByDomain($domain): ?User
    {
        $domain = trim((string) $domain);
        if ($domain === '') {
            return null;
        }

        // Bare host: no protocol, no trailing slash.
        $bare = rtrim(preg_replace('#^https?://#i', '', $domain), '/');

        // 1. The .myshopify.com domain is stored on users.name.
        $user = User::where('name', $bare)->orWhere('name', $domain)->first();
        if ($user) {
            return $user;
        }

        // 2. Custom/primary or myshopify domain on store_details. These are often
        //    stored WITH the protocol, so match a few normalized variants.
        $candidates = array_values(array_unique([
            $bare,
            $domain,
            "https://{$bare}",
            "http://{$bare}",
            "https://{$bare}/",
            "http://{$bare}/",
        ]));

        $detail = StoreDetail::where(function ($q) use ($candidates) {
            $q->whereIn('primary_domain', $candidates)
              ->orWhereIn('shopify_domain', $candidates);
        })->first();

        return $detail ? User::find($detail->user_id) : null;
    }
}
