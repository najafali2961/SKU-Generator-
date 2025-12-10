<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Osiset\ShopifyApp\Storage\Models\Plan;

class PricingController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $plans = Plan::where('test', 0)
            ->orderBy('price', 'asc')
            ->get()
            ->map(fn($plan) => [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => number_format($plan->price, 2),
                'interval' => $plan->interval,
                'trial_days' => $plan->trial_days ?? 0,
                'capped_amount' => $plan->capped_amount,
                'terms' => $plan->terms,
                'features' => $this->getPlanFeatures($plan->name),
            ]);

        $currentPlan = $user->plan_id ? Plan::find($user->plan_id) : null;

        return Inertia::render('Pricing', [
            'plans' => $plans,
            'currentPlan' => $currentPlan ? [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'price' => $currentPlan->price,
            ] : ['id' => null, 'name' => 'Free'],
            'user' => $user->only(['id', 'name', 'shopify_freemium', 'plan_id']),
        ]);
    }

    public function selectPlan(Request $request, $planId)
    {
        $user = Auth::user();
        $plan = Plan::findOrFail($planId);

        if ($user->plan_id == $planId) {
            return redirect()->route('pricing')->with('info', 'You are already on this plan.');
        }

        try {
            $chargeData = [
                'name' => $plan->name,
                'price' => (float) $plan->price,
                'return_url' => route('billing.process'),
                'test' => false,
            ];

            if ($plan->trial_days > 0) {
                $chargeData['trial_days'] = (int) $plan->trial_days;
            }

            if ($plan->capped_amount > 0) {
                $chargeData['capped_amount'] = (float) $plan->capped_amount;
                $chargeData['terms'] = $plan->terms ?? "Up to $plan->capped_amount usage";
            }

            Log::info('Creating Shopify charge', ['data' => $chargeData]);

            $response = $user->api()->rest('POST', '/admin/api/2024-10/recurring_application_charges.json', [
                'recurring_application_charge' => $chargeData
            ]);

            // THIS IS THE BULLETPROOF FIX
            $body = $response['body'] ?? null;

            // Handle case where body is string (error response, HTML, etc.)
            if (is_string($body)) {
                Log::error('Shopify returned string body', ['body' => substr($body, 0, 500)]);
                throw new \Exception('Invalid response from Shopify');
            }

            // Safely extract charge from both possible structures
            $charge = null;
            if (isset($body['recurring_application_charge'])) {
                $charge = $body['recurring_application_charge'];
            } elseif (isset($body['container']['recurring_application_charge'])) {
                $charge = $body['container']['recurring_application_charge'];
            }

            // Safe logging — no more array_keys() crash
            Log::info('Shopify charge response', [
                'status' => $response['status'] ?? 'unknown',
                'errors' => $response['errors'] ?? true,
                'body_type' => gettype($body),
                'body_keys' => is_array($body) ? array_keys($body) : 'not_array',
                'charge_found' => $charge ? 'YES' : 'NO',
                'confirmation_url' => $charge['confirmation_url'] ?? 'missing',
            ]);

            if (
                $response['errors'] === false &&
                ($response['status'] ?? 0) === 201 &&
                $charge &&
                !empty($charge['confirmation_url'])
            ) {

                session([
                    'pending_charge_id' => $charge['id'],
                    'pending_plan_id' => $planId,
                ]);

                return redirect()->away($charge['confirmation_url']);
            }

            throw new \Exception('No confirmation URL received from Shopify');
        } catch (\Exception $e) {
            Log::error('Plan selection failed', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'plan_id' => $planId,
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('pricing')
                ->with('error', 'Could not start billing. Please refresh and try again.');
        }
    }

    public function processBilling(Request $request)
    {
        $user = Auth::user();
        $chargeId = $request->input('charge_id');

        if (!$chargeId) {
            return redirect()->route('pricing')->with('error', 'No charge ID.');
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
                return redirect()->route('home')->with('success', 'Plan activated!');
            }

            if ($charge['status'] === 'declined') {
                session()->forget(['pending_charge_id', 'pending_plan_id']);
                return redirect()->route('pricing')->with('error', 'Payment declined.');
            }
        } catch (\Exception $e) {
            Log::error('Billing failed', ['error' => $e->getMessage()]);
        }

        return redirect()->route('pricing')->with('error', 'Billing failed.');
    }
    public function cancel(Request $request)
    {
        $user = Auth::user();

        if (!$user->plan_id) {
            return redirect()->route('pricing')->with('info', 'No active plan.');
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
                ->with('success', 'Subscription cancelled.');
        } catch (\Exception $e) {
            Log::error('Cancel failed', ['error' => $e->getMessage()]);
            return redirect()->route('pricing')->with('error', 'Could not cancel.');
        }
    }

    private function getPlanFeatures($planName)
    {
        $features = [
            'Basic' => ['Unlimited SKU', 'Unlimited barcode', 'Label printing', 'Email support'],
            'Pro' => ['Everything in Basic', 'Advanced features', 'Priority support', 'Multi-store'],
            'Pro Annual' => ['Everything in Pro', 'Save 17%', 'Dedicated support'],
        ];

        return $features[$planName] ?? ['Basic features'];
    }

    // Your working upgradePlan method from other project
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
            return response()->json(['success' => false, 'message' => 'Plan not found'], 404);
        }

        $handle = config('services.app_handle', 'bulkapp-4');

        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Redirecting to billing...'
        ]);
    }
}
