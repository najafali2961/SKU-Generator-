<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Osiset\ShopifyApp\Storage\Models\Plan;

class PricingController extends Controller
{
    /**
     * Display pricing page with all available plans
     */
    public function index()
    {
        $user = Auth::user();

        // Get all active plans
        $plans = Plan::where('test', 0)
            ->orderBy('price', 'asc')
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => number_format($plan->price, 2),
                    'interval' => $plan->interval,
                    'trial_days' => $plan->trial_days ?? 0,
                    'capped_amount' => $plan->capped_amount,
                    'terms' => $plan->terms,
                    'type' => $plan->type,
                    'features' => $this->getPlanFeatures($plan->name),
                ];
            });

        // Get current plan details
        $currentPlan = null;
        if ($user->plan_id) {
            $currentPlan = Plan::find($user->plan_id);
            if ($currentPlan) {
                $currentPlan = [
                    'id' => $currentPlan->id,
                    'name' => $currentPlan->name,
                    'price' => $currentPlan->price,
                ];
            }
        }

        return Inertia::render('Pricing', [
            'plans' => $plans,
            'currentPlan' => $currentPlan ?? ['id' => null, 'name' => 'Free'],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'shopify_freemium' => $user->shopify_freemium,
                'plan_id' => $user->plan_id,
            ],
        ]);
    }

    /**
     * Handle plan selection and redirect to billing
     */
    public function selectPlan(Request $request, $planId)
    {
        $user = Auth::user();
        $plan = Plan::findOrFail($planId);

        Log::info('Plan selection initiated', [
            'user_id' => $user->id,
            'shop' => $user->name,
            'selected_plan_id' => $planId,
            'current_plan_id' => $user->plan_id,
        ]);

        // If already on this plan
        if ($user->plan_id == $planId) {
            return redirect()
                ->route('pricing')
                ->with('info', 'You are already subscribed to this plan.');
        }

        try {
            // Redirect to Shopify billing flow
            // The shopify-app package handles the billing redirect
            return redirect()->route('billing', ['plan' => $plan->id]);
        } catch (\Exception $e) {
            Log::error('Plan selection error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'plan_id' => $planId,
            ]);

            return redirect()
                ->route('pricing')
                ->with('error', 'Unable to process plan selection. Please try again.');
        }
    }

    /**
     * Get feature list for each plan
     */
    private function getPlanFeatures($planName)
    {
        $features = [
            'Basic' => [
                'Unlimited SKU generation',
                'Unlimited barcode generation',
                'Basic label printing',
                'Standard templates',
                'Import/Export capabilities',
                'Email support',
                'Single store',
            ],
            'Pro' => [
                'Everything in Basic',
                'Advanced label customization',
                'Premium templates library',
                'Bulk operations',
                'Priority email support',
                'Multiple stores',
                'Advanced reporting',
                'Custom barcode formats',
            ],
            'Pro Annual' => [
                'Everything in Pro',
                'Save 17% compared to monthly',
                'Dedicated account manager',
                'Early access to new features',
                '24/7 priority support',
                'Custom integrations',
                'Advanced API access',
                'Quarterly business reviews',
            ],
        ];

        return $features[$planName] ?? [
            'Standard features',
            'Email support',
        ];
    }

    /**
     * Cancel current subscription
     */
    public function cancel(Request $request)
    {
        $user = Auth::user();

        if (!$user->plan_id) {
            return redirect()
                ->route('pricing')
                ->with('info', 'You do not have an active subscription.');
        }

        try {
            // Cancel the subscription through Shopify
            $user->plan_id = null;
            $user->shopify_freemium = 1;
            $user->save();

            Log::info('Subscription cancelled', [
                'user_id' => $user->id,
                'shop' => $user->name,
            ]);

            return redirect()
                ->route('home')
                ->with('success', 'Your subscription has been cancelled. You now have access to free features.');
        } catch (\Exception $e) {
            Log::error('Subscription cancellation error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return redirect()
                ->route('pricing')
                ->with('error', 'Unable to cancel subscription. Please contact support.');
        }
    }
}
