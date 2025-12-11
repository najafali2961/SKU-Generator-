<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class CheckCredits
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ?string $feature = null)
    {
        /** @var User $user */
        $user = Auth::user();

        Log::info('CheckCredits middleware triggered', [
            'user_id' => $user?->id,
            'route' => $request->route()->getName(),
            'feature_param' => $feature,
            'user_credits' => $user?->credits,
            'user_credits_used' => $user?->credits_used,
            'has_unlimited' => $user?->hasUnlimitedCredits(),
            'has_zero_credits' => $user?->hasZeroCredits(),
            'plan_id' => $user?->plan_id,
        ]);

        if (!$user) {
            Log::warning('CheckCredits: No authenticated user');
            abort(403);
        }

        // Block access if user has zero credits
        if ($user->hasZeroCredits()) {
            Log::warning('CheckCredits: User has zero credits, blocking access', [
                'user_id' => $user->id,
                'credits' => $user->credits,
                'credits_used' => $user->credits_used,
                'route' => $request->route()->getName(),
            ]);

            return inertia('NoCreditPage', [
                'feature' => $this->getFeatureName($feature),
                'required_credits' => 1,
                'available_credits' => $user->getAvailableCredits(),
            ]);
        }

        Log::info('CheckCredits: User has credits, continuing', [
            'user_id' => $user->id,
            'credits' => $user->credits,
            'available_credits' => $user->getAvailableCredits(),
            'route' => $request->route()->getName(),
        ]);

        // Feature-specific credit check
        if ($feature && !$user->hasUnlimitedCredits()) {
            $requiredCredits = $user->getCreditCost($feature, 1);
            $availableCredits = $user->getAvailableCredits();

            Log::info('CheckCredits: Checking feature-specific credits', [
                'user_id' => $user->id,
                'feature' => $feature,
                'cost_per_unit' => $requiredCredits,
                'available' => $availableCredits,
            ]);

            if ($availableCredits < $requiredCredits) {
                Log::warning('CheckCredits: Insufficient feature-specific credits', [
                    'user_id' => $user->id,
                    'feature' => $feature,
                    'required' => $requiredCredits,
                    'available' => $availableCredits,
                ]);

                return inertia('NoCreditPage', [
                    'feature' => $this->getFeatureName($feature),
                    'required_credits' => $requiredCredits,
                    'available_credits' => $availableCredits,
                ]);
            }
        }

        return $next($request);
    }

    /**
     * Convert feature keys to pretty names.
     */
    private function getFeatureName(?string $feature): string
    {
        return match ($feature) {
            'sku_generation'      => 'SKU Generation',
            'barcode_generation'  => 'Barcode Generation',
            'barcode_import'      => 'Barcode Import',
            'label_printing'      => 'Label Printing',
            default               => 'This Feature',
        };
    }
}
