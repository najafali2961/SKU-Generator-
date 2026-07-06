<?php

namespace App\Http\Controllers;

use App\Models\Feature;
use App\Models\Plan;
use App\Models\PlanChangeLog;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PricingController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Get all plans with their features. Auto-generated custom plans
        // ("Custom Plan (N Credits)" rows created by the credits calculator)
        // are NEVER shown as pricing cards, whatever their visibility flag —
        // a subscriber still sees theirs in the Active Subscription bar and
        // on the dashboard credits card.
        $plans = Plan::with('features')
            ->where('is_visible', true)
            ->where('name', 'not like', 'Custom Plan (%')
            ->orderBy('price', 'asc')
            ->get()
            ->map(fn($plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'description' => $plan->description,
                'price' => number_format($plan->price, 2),
                'monthly_credits' => $plan->monthly_credits,
                'unlimited_credits' => $plan->unlimited_credits,
                'interval' => $plan->interval,
                'trial_days' => $plan->trial_days ?? 0,
                'features' => $plan->features->pluck('name')->toArray(),
                'feature_ids' => $plan->features->pluck('id')->toArray(),
                'capped_amount' => $plan->capped_amount,
                'terms' => $plan->terms,
            ]);

        // Get current plan
        $currentPlan = $user->plan_id ? Plan::with('features')->find($user->plan_id) : null;

        // Get all active features
        $allFeatures = Feature::where('is_active', true)
            ->orderBy('category')
            ->orderBy('sort_order')
            ->get()
            ->map(fn($f) => [
                'id' => $f->id,
                'name' => $f->name,
                'description' => $f->description,
                'icon' => $f->icon,
                'category' => $f->category,
            ]);

        return Inertia::render('Pricing', [
            'plans' => $plans,
            'currentPlan' => $currentPlan ? [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'price' => $currentPlan->price,
                'interval' => $currentPlan->interval,
                'features' => $currentPlan->features->pluck('id')->toArray(),
            ] : ['id' => null, 'name' => 'Free', 'features' => []],
            'user' => array_merge(
                $user->only(['id', 'name', 'email', 'credits', 'shopify_freemium']),
                [
                    'is_freemium' => $user->isFreemium(),
                    'available_credits' => $user->hasUnlimitedCredits() ? null : $user->getAvailableCredits(),
                ]
            ),
            'allFeatures' => $allFeatures,
            'settings' => [
                'yearly_discount_badge' => Setting::getValue('yearly_discount_badge', 'Save 20%'),
                'custom_credit_price_per_unit' => Setting::getValue('custom_credit_price_per_unit', 0.05),
                'custom_credit_min_amount' => Setting::getValue('custom_credit_min_amount', 100),
            ],
        ]);
    }


    public function selectPlan(Request $request, $planId)
    {
        $token = null;
        $shop = auth()->user()->name;

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }

        $request->validate([
            'plan_id' => 'sometimes|integer',
        ]);

        $plan = Plan::find($planId);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found'
            ], 404);
        }

        $handle = config('shopify-app.app_handle', '');
        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Plan created successfully'
        ]);
    }

    public function selectCustomPlan(Request $request)
    {
        $token = null;
        $shop = auth()->user()->name;

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }

        $request->validate([
            'credits' => 'required|integer|min:1',
        ]);

        $credits = (int) $request->input('credits');

        // Price is computed SERVER-SIDE from the admin-configured rate.
        // Never trust a client-posted price — that allowed $0 subscriptions.
        $pricePerUnit = (float) Setting::getValue('custom_credit_price_per_unit', 0.05);
        $minCredits = (int) Setting::getValue('custom_credit_min_amount', 100);

        if ($credits < $minCredits) {
            return response()->json([
                'success' => false,
                'message' => "Custom plans start at {$minCredits} credits.",
            ], 422);
        }

        $price = round($credits * $pricePerUnit, 2);

        $planName = "Custom Plan ({$credits} Credits)";

        // test stays false at the plan level: dev stores get their test
        // charge via DevAwareChargeHelper, real stores always pay live.
        $plan = Plan::firstOrCreate(
            ['name' => $planName, 'price' => $price, 'interval' => 'EVERY_30_DAYS'],
            [
                'type' => 'RECURRING',
                'test' => false,
                'on_install' => 0,
                'is_visible' => false,
                'capped_amount' => 0,
                'terms' => "Monthly custom allocation of {$credits} credits",
            ]
        );

        // Make sure to add credits to this custom plan if not set during firstOrCreate
        if (!$plan->monthly_credits) {
            $plan->monthly_credits = $credits;
            $plan->save();
        }

        $handle = config('shopify-app.app_handle', '');
        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Custom plan created successfully'
        ]);
    }

    /**
     * Merchant-initiated subscription cancel: cancels the live Shopify
     * subscription(s), records the plan change, and drops the store back to
     * the free tier. Remaining credits from the paid cycle are kept.
     */
    public function cancel(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->plan_id) {
            return response()->json([
                'success' => false,
                'message' => 'No active plan to cancel.',
            ], 400);
        }

        $previousPlan = Plan::find($user->plan_id);

        try {
            // Vendor code stores statuses uppercase (ChargeStatus enum);
            // match both cases so nothing slips through on other collations.
            $charges = $user->charges()
                ->whereIn('status', ['ACTIVE', 'ACCEPTED', 'active', 'accepted'])
                ->whereNull('cancelled_on')
                ->get();

            $stillInTrial = false;

            foreach ($charges as $charge) {
                if ($charge->trial_ends_on && now()->startOfDay()->lte($charge->trial_ends_on)) {
                    $stillInTrial = true;
                }

                $gid = 'gid://shopify/AppSubscription/' . $charge->charge_id;
                $response = $user->api()->graph(
                    'mutation cancel($id: ID!) { appSubscriptionCancel(id: $id) { userErrors { message } } }',
                    ['id' => $gid]
                );

                $errors = data_get(
                    $response,
                    'body.container.data.appSubscriptionCancel.userErrors',
                    data_get($response, 'body.data.appSubscriptionCancel.userErrors', [])
                );

                if (!empty($errors)) {
                    // Do NOT revert the plan locally if Shopify refused the
                    // cancel — that would leave the merchant billed while the
                    // app shows them as free.
                    Log::error('Shopify subscription cancel returned errors', [
                        'user_id' => $user->id,
                        'charge_id' => $charge->charge_id,
                        'errors' => $errors,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Shopify could not cancel the subscription. Please try again or contact support.',
                    ], 502);
                }

                $charge->update(['status' => 'CANCELLED', 'cancelled_on' => now()]);
                $charge->delete();
            }

            // A normal mid-cycle cancel keeps the paid cycle's remaining
            // credits, but the unlimited 999999 sentinel and never-billed
            // trial allowances must not survive as free spendable credits.
            $clamped = $previousPlan?->unlimited_credits || $stillInTrial;
            if ($clamped) {
                $user->credits = (int) Setting::getValue('free_plan_credits', 500);
                $user->credits_used = 0;
            }

            PlanChangeLog::record(
                $user,
                $previousPlan,
                null,
                PlanChangeLog::SOURCE_MERCHANT_CANCEL,
                notes: $clamped
                    ? 'Cancelled from the pricing page (credits reset to free tier: ' . ($stillInTrial ? 'trial not billed' : 'unlimited plan') . ')'
                    : 'Cancelled from the pricing page'
            );

            $user->plan_id = null;
            $user->shopify_freemium = 1;
            $user->credits_reset_at = null;
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Subscription cancelled successfully.',
            ]);
        } catch (\Exception $e) {
            Log::error('Cancellation failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Could not cancel subscription. Please contact support.',
            ], 500);
        }
    }

    /**
     * Credit usage summary for the dashboard (last 30 days, per feature).
     */
    public function creditStats()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $stats = $user->getCreditUsageStats(30);
        $plan = $user->plan;

        return response()->json([
            'plan' => [
                'id' => $plan?->id,
                'name' => $plan?->name ?? ($user->isFreemium() ? 'Free' : 'None'),
                'monthly_credits' => $plan?->monthly_credits,
                'unlimited' => $user->hasUnlimitedCredits(),
            ],
            'credits' => [
                'total' => $user->credits,
                'used' => $user->credits_used,
                'available' => $user->hasUnlimitedCredits() ? null : $user->getAvailableCredits(),
                'next_reset_at' => $user->plan_id ? $user->credits_reset_at?->toIso8601String() : null,
            ],
            'last_30_days' => [
                'total_used' => $stats['total_used'],
                'by_feature' => $stats['by_feature'],
            ],
        ]);
    }
}
