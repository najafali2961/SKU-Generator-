<?php

namespace App\Traits;

use App\Models\CreditUsageLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

trait HasCredits
{
    /**
     * Get the credit costs for each feature
     */
    protected function getCreditCosts(): array
    {
        return [
            'sku_generation' => config('credits.costs.sku_generation', 1),
            'barcode_generation' => config('credits.costs.barcode_generation', 1),
            'barcode_import' => config('credits.costs.barcode_import', 1),
            'label_printing' => config('credits.costs.label_printing', 2),
            'template_save' => config('credits.costs.template_save', 0), // Free
        ];
    }

    /**
     * Check if user has unlimited credits
     */
    public function hasUnlimitedCredits(): bool
    {
        // Get the plan using the existing plan() method from ShopModel trait
        $plan = $this->plan;

        if (!$plan) {
            return false;
        }

        return $plan->unlimited_credits === true || $plan->unlimited_credits === 1;
    }

    /**
     * Check if user has enough credits for a feature
     */
    public function hasCredits(string $feature, int $quantity = 1): bool
    {
        // Unlimited credits
        if ($this->hasUnlimitedCredits()) {
            return true;
        }

        // Get credit cost for feature
        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;
        $totalCost = $costPerUnit * $quantity;

        // Check available credits
        return $this->credits >= $totalCost;
    }

    /**
     * Get available credits
     */
    public function getAvailableCredits(): int
    {
        if ($this->hasUnlimitedCredits()) {
            return PHP_INT_MAX;
        }

        return max(0, $this->credits);
    }

    /**
     * Use credits for a feature
     */
    public function useCredits(string $feature, int $quantity = 1, ?string $description = null, ?array $metadata = null): bool
    {
        // If unlimited, just log it but don't deduct
        if ($this->hasUnlimitedCredits()) {
            $this->logCreditUsage($feature, 0, $description, $metadata);
            return true;
        }

        // Get credit cost
        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;
        $totalCost = $costPerUnit * $quantity;

        // Check if user has enough credits
        if ($this->credits < $totalCost) {
            Log::warning('Insufficient credits', [
                'user_id' => $this->id,
                'feature' => $feature,
                'required' => $totalCost,
                'available' => $this->credits
            ]);
            return false;
        }

        // Deduct credits
        $creditsBefore = $this->credits;
        $this->credits -= $totalCost;
        $this->credits_used += $totalCost;
        $this->save();

        // Log usage
        $this->logCreditUsage($feature, $totalCost, $description, $metadata, $creditsBefore);

        Log::info('Credits used', [
            'user_id' => $this->id,
            'feature' => $feature,
            'quantity' => $quantity,
            'cost' => $totalCost,
            'remaining' => $this->credits
        ]);

        return true;
    }

    /**
     * Add credits to user account
     */
    public function addCredits(int $amount, ?string $reason = null): void
    {
        $creditsBefore = $this->credits;
        $this->credits += $amount;
        $this->save();

        Log::info('Credits added', [
            'user_id' => $this->id,
            'amount' => $amount,
            'reason' => $reason,
            'new_balance' => $this->credits
        ]);

        // Log as credit addition
        CreditUsageLog::create([
            'user_id' => $this->id,
            'feature' => 'credit_addition',
            'credits_used' => -$amount, // Negative to show addition
            'credits_before' => $creditsBefore,
            'credits_after' => $this->credits,
            'description' => $reason ?? 'Credits added',
            'metadata' => ['reason' => $reason]
        ]);
    }

    /**
     * Reset monthly credits based on plan
     */
    public function resetMonthlyCredits(): void
    {
        $plan = $this->plan;

        if (!$plan) {
            return;
        }

        $oldCredits = $this->credits;
        $newCredits = $plan->monthly_credits;

        $this->credits = $newCredits;
        $this->credits_used = 0;
        $this->credits_reset_at = Carbon::now();
        $this->save();

        Log::info('Monthly credits reset', [
            'user_id' => $this->id,
            'plan' => $plan->name,
            'old_credits' => $oldCredits,
            'new_credits' => $newCredits
        ]);

        // Log the reset
        CreditUsageLog::create([
            'user_id' => $this->id,
            'feature' => 'monthly_reset',
            'credits_used' => 0,
            'credits_before' => $oldCredits,
            'credits_after' => $newCredits,
            'description' => 'Monthly credit reset',
            'metadata' => [
                'plan_id' => $plan->id,
                'plan_name' => $plan->name
            ]
        ]);
    }

    /**
     * Check if credits need to be reset
     */
    public function shouldResetCredits(): bool
    {
        if (!$this->plan || !$this->credits_reset_at) {
            return true; // First time setup
        }

        // Reset if it's been more than 30 days
        return Carbon::now()->diffInDays($this->credits_reset_at) >= 30;
    }

    /**
     * Get credit usage statistics
     */
    public function getCreditUsageStats(?int $days = 30): array
    {
        $query = CreditUsageLog::where('user_id', $this->id)
            ->where('credits_used', '>', 0);

        if ($days) {
            $query->where('created_at', '>=', Carbon::now()->subDays($days));
        }

        $logs = $query->get();

        return [
            'total_used' => $logs->sum('credits_used'),
            'by_feature' => $logs->groupBy('feature')->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'total_credits' => $items->sum('credits_used'),
                ];
            }),
            'current_balance' => $this->credits,
            'lifetime_used' => $this->credits_used,
        ];
    }

    /**
     * Get credit cost for a feature
     */
    public function getCreditCost(string $feature, int $quantity = 1): int
    {
        if ($this->hasUnlimitedCredits()) {
            return 0;
        }

        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;

        return $costPerUnit * $quantity;
    }

    /**
     * Log credit usage
     */
    protected function logCreditUsage(string $feature, int $creditsUsed, ?string $description = null, ?array $metadata = null, ?int $creditsBefore = null): void
    {
        CreditUsageLog::create([
            'user_id' => $this->id,
            'feature' => $feature,
            'credits_used' => $creditsUsed,
            'credits_before' => $creditsBefore ?? $this->credits + $creditsUsed,
            'credits_after' => $this->credits,
            'description' => $description,
            'metadata' => $metadata
        ]);
    }

    /**
     * Get credit usage logs relationship
     */
    public function creditUsageLogs()
    {
        return $this->hasMany(CreditUsageLog::class);
    }
}
