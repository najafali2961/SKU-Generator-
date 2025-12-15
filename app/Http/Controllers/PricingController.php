<?php

namespace App\Http\Controllers;

use App\Models\Feature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Osiset\ShopifyApp\Storage\Models\Plan;

class PricingController extends Controller
{
    // public function index()
    // {
    //     $user = Auth::user();

    //     $plans = Plan::orderBy('price', 'asc')
    //         ->get()
    //         ->map(fn($plan) => [
    //             'id' => $plan->id,
    //             'name' => $plan->name,
    //             'price' => number_format($plan->price, 2),
    //             'interval' => $plan->interval,
    //             'trial_days' => $plan->trial_days ?? 0,
    //             'capped_amount' => $plan->capped_amount,
    //             'terms' => $plan->terms,
    //             'features' => $this->getPlanFeatures($plan->name),
    //         ]);

    //     $currentPlan = $user->plan_id ? Plan::find($user->plan_id) : null;

    //     return Inertia::render('Pricing', [
    //         'plans' => $plans,
    //         'currentPlan' => $currentPlan ? [
    //             'id' => $currentPlan->id,
    //             'name' => $currentPlan->name,
    //             'price' => $currentPlan->price,
    //         ] : ['id' => null, 'name' => 'Free'],
    //         'user' => $user->only(['id', 'name', 'shopify_freemium', 'plan_id']),
    //     ]);
    // }

    // public function selectPlan(Request $request, $planId)
    // {
    //     $token = null;
    //     $shop = auth()->user()->name;

    //     $authHeader = $request->header('Authorization');
    //     if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
    //         $token = substr($authHeader, 7);
    //     }

    //     $request->validate([
    //         'plan_id' => 'sometimes|integer',
    //     ]);

    //     $plan = Plan::find($planId);

    //     if (!$plan) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Plan not found'
    //         ], 404);
    //     }

    //     $handle = env('SHOPIFY_APP_HANDLE', '');
    //     $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

    //     return response()->json([
    //         'success' => true,
    //         'redirectUrl' => $redirectUrl,
    //         'message' => 'Plan created successfully'
    //     ]);
    // }

    public function upgradePlan(Request $request)
    {
        $token = null;
        $shop = auth()->user()->name;

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }

        $request->validate(['plan_id' => 'required|integer']);

        $plan = Plan::find($request->plan_id);

        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found'
            ], 404);
        }

        $handle = config('services.app_handle', '');
        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Redirecting to billing...'
        ]);
    }

    public function processBilling(Request $request)
    {
        $user = Auth::user();
        $chargeId = $request->input('charge_id');

        if (!$chargeId) {
            return redirect()->route('pricing')->with('error', 'No charge ID provided.');
        }

        try {
            $response = $user->api()->rest('GET', "/admin/api/2024-10/recurring_application_charges/{$chargeId}.json");

            $body = $response['body'] ?? null;

            if (is_string($body)) {
                throw new \Exception('Invalid charge response');
            }

            $charge = $body['recurring_application_charge']
                ?? $body['container']['recurring_application_charge']
                ?? null;

            if (!$charge) {
                throw new \Exception('Charge not found');
            }

            if ($charge['status'] === 'accepted') {
                $user->api()->rest('POST', "/admin/api/2024-10/recurring_application_charges/{$chargeId}/activate.json");
                session()->forget(['pending_charge_id', 'pending_plan_id']);
                return redirect()->route('home')->with('success', 'Plan activated successfully!');
            }

            if ($charge['status'] === 'declined') {
                session()->forget(['pending_charge_id', 'pending_plan_id']);
                return redirect()->route('pricing')->with('error', 'Payment was declined.');
            }
        } catch (\Exception $e) {
            Log::error('Billing processing failed', [
                'error' => $e->getMessage(),
                'charge_id' => $chargeId
            ]);
        }

        return redirect()->route('pricing')->with('error', 'Billing processing failed.');
    }

    public function cancel(Request $request)
    {
        $user = Auth::user();

        if (!$user->plan_id) {
            return redirect()->route('pricing')->with('info', 'No active plan to cancel.');
        }

        try {
            $response = $user->api()->rest('GET', '/admin/api/2024-10/recurring_application_charges.json');

            if (isset($response['body']['recurring_application_charges'])) {
                foreach ($response['body']['recurring_application_charges'] as $charge) {
                    if ($charge['status'] === 'active') {
                        $user->api()->rest('DELETE', "/admin/api/2024-10/recurring_application_charges/{$charge['id']}.json");
                    }
                }
            }

            $user->plan_id = null;
            $user->shopify_freemium = 1;
            $user->save();

            return redirect()->route('home')
                ->with('success', 'Subscription cancelled successfully.');
        } catch (\Exception $e) {
            Log::error('Cancellation failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id
            ]);
            return redirect()->route('pricing')->with('error', 'Could not cancel subscription.');
        }
    }

    public function subscribeFreePlan()
    {
        $shop = auth()->user();

        if ($shop->plan_id == null || !in_array($shop->plan_id, [1, 2, 3, 4])) {
            $shop->update([
                'shopify_freemium' => 1
            ]);
        } else {
            // You'll need to implement cancelSubscription method or handle differently
            // For now, just setting freemium flag
            $shop->update([
                'shopify_freemium' => 1,
                'plan_id' => null
            ]);
        }

        return redirect()->back()->with('success', 'Switched to free plan successfully.');
    }

    private function getPlanFeatures($planName)
    {
        $features = [
            'Basic' => [
                'Unlimited SKU generation',
                'Unlimited barcode generation',
                'Label printing',
                'Email support'
            ],
            'Pro' => [
                'Everything in Basic',
                'Advanced features',
                'Priority support',
                'Multi-store support'
            ],
            'Pro Annual' => [
                'Everything in Pro',
                'Save 17% annually',
                'Dedicated support',
                'Early access to features'
            ],
        ];

        return $features[$planName] ?? ['Basic features'];
    }


    public function index()
    {
        $user = Auth::user();

        // Get all plans with their features
        $plans = Plan::with('features')
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
                'features' => $currentPlan->features->pluck('id')->toArray(),
            ] : ['id' => null, 'name' => 'Free', 'features' => []],
            'user' => $user->only(['id', 'name', 'email', 'credits']),
            'allFeatures' => $allFeatures,
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

        $plan = Plan::find($planId);
        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Plan not found'
            ], 404);
        }

        $handle = env('SHOPIFY_APP_HANDLE', '');
        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Plan selected successfully'
        ]);
    }
}
