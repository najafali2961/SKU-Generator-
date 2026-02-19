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
            'user' => array_merge(
                $user->only(['id', 'name', 'email', 'credits', 'shopify_freemium']),
                ['is_freemium' => $user->isFreemium()]
            ),
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

        $handle = env('SHOPIFY_APP_HANDLE', '');
        $redirectUrl = "https://{$shop}/admin/apps/{$handle}/billing/{$plan->id}?token={$token}";

        return response()->json([
            'success' => true,
            'redirectUrl' => $redirectUrl,
            'message' => 'Plan created successfully'
        ]);
    }
}
