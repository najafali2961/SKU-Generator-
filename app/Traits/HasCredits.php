<?php

namespace App\Traits;

use App\Models\CreditUsageLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

trait HasCredits
{
    /**
     * Default credit cost per feature, used when no admin override is set.
     */
    public const DEFAULT_CREDIT_COSTS = [
        'sku_generation' => 1,
        'barcode_generation' => 1,
        'barcode_import' => 1, // also covers CSV barcode import
        'label_printing' => 2,
        'template_save' => 0, // Free
    ];

    /**
     * Get the credit cost for each feature.
     *
     * Costs are admin-configurable from the Credit Settings page (stored in the
     * settings table as credit_cost_<feature>). Any feature without an override
     * falls back to DEFAULT_CREDIT_COSTS. Read fresh each call so changes apply
     * immediately (important under long-running Octane workers).
     */
    protected function getCreditCosts(): array
    {
        $keys = array_map(
            fn (string $feature): string => "credit_cost_{$feature}",
            array_keys(self::DEFAULT_CREDIT_COSTS)
        );

        $overrides = \App\Models\Setting::whereIn('key', $keys)->pluck('value', 'key');

        $costs = [];
        foreach (self::DEFAULT_CREDIT_COSTS as $feature => $default) {
            $value = $overrides["credit_cost_{$feature}"] ?? null;
            $costs[$feature] = is_numeric($value) ? (int) $value : $default;
        }

        return $costs;
    }

    /**
     * Check if user has unlimited credits
     */
    public function hasUnlimitedCredits(): bool
    {
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
        if ($this->hasUnlimitedCredits()) {
            return true;
        }

        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;
        $totalCost = $costPerUnit * $quantity;

        return $this->getAvailableCredits() >= $totalCost;
    }

    /**
     * Get available credits
     */
    public function getAvailableCredits(): int
    {
        if ($this->hasUnlimitedCredits()) {
            return PHP_INT_MAX;
        }



        // Available = allocated credits - used credits
        return max(0, $this->credits - $this->credits_used);
    }

    /**
     * Calculate max allowed items based on available credits
     */
    public function getMaxAllowedItems(string $feature): int
    {
        if ($this->hasUnlimitedCredits()) {
            return PHP_INT_MAX;
        }

        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;

        return (int) floor(($this->credits - $this->credits_used) / $costPerUnit);
    }

    /**
     * Validate if operation can proceed with available credits
     */
    public function validateCreditsForOperation(string $feature, int $quantity): array
    {
        if ($this->hasUnlimitedCredits()) {
            return [
                'success' => true,
                'can_proceed' => true,
                'required' => 0,
                'available' => PHP_INT_MAX,
                'max_allowed' => PHP_INT_MAX,
            ];
        }

        $required = $this->getCreditCost($feature, $quantity);
        $available = $this->getAvailableCredits();
        $maxAllowed = $this->getMaxAllowedItems($feature);

        $canProceed = $available >= $required;

        return [
            'success' => $canProceed,
            'can_proceed' => $canProceed,
            'required' => $required,
            'available' => $available,
            'max_allowed' => $maxAllowed,
            'message' => $canProceed
                ? "You have enough credits for this operation."
                : "Insufficient credits. You need {$required} credits but only have {$available} available. Maximum items you can process: {$maxAllowed}",
        ];
    }

    /**
     * Use credits for a feature
     */
    public function useCredits(
        string $feature,
        int $quantity = 1,
        ?string $description = null,
        ?array $metadata = null
    ): bool {
        // If unlimited, just log usage but do not increment credits_used
        if ($this->hasUnlimitedCredits()) {
            $this->logCreditUsage($feature, 0, $description, $metadata);
            return true;
        }

        // Get cost per unit for the feature
        $costs = $this->getCreditCosts();
        $costPerUnit = $costs[$feature] ?? 1;
        $totalCost = $costPerUnit * $quantity;

        // Atomic, guarded deduction: the WHERE clause re-checks the balance in
        // the same statement, so concurrent jobs (Octane workers, queued jobs)
        // can never double-spend past the allowance.
        $availableBefore = $this->credits - $this->credits_used;
        $updated = static::query()
            ->whereKey($this->id)
            ->whereRaw('(credits - credits_used) >= ?', [$totalCost])
            ->increment('credits_used', $totalCost);

        if (!$updated) {
            Log::warning('Insufficient credits', [
                'user_id' => $this->id,
                'feature' => $feature,
                'required' => $totalCost,
                'available' => $availableBefore,
            ]);
            return false;
        }

        $this->refresh();

        // Log the usage
        $this->logCreditUsage($feature, $totalCost, $description, $metadata, $availableBefore);

        // Notify the merchant once when they fully exhaust their credits.
        if (($this->credits - $this->credits_used) <= 0) {
            \App\Services\EmailService::sendCreditsExhausted($this);
        }

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

        CreditUsageLog::create([
            'user_id' => $this->id,
            'feature' => 'credit_addition',
            'credits_used' => -$amount,
            'credits_before' => $creditsBefore,
            'credits_after' => $this->credits,
            'description' => $reason ?? 'Credits added',
            'metadata' => ['reason' => $reason]
        ]);
    }

    /**
     * Reset monthly credits based on plan.
     *
     * credits_reset_at always holds the NEXT scheduled refill time (the
     * credits:reset-monthly command picks up rows where it is in the past).
     * Credits refill every 30 days regardless of billing interval, so annual
     * plans get their monthly allowance too.
     */
    public function resetMonthlyCredits(): void
    {
        $plan = $this->plan;

        if (!$plan) {
            return;
        }

        $oldCredits = $this->credits;
        // Keep the unlimited sentinel in sync with PlanActivatedListener.
        $newCredits = $plan->unlimited_credits ? 999999 : (int) $plan->monthly_credits;

        $this->credits = $newCredits;
        $this->credits_used = 0;
        $this->credits_reset_at = Carbon::now()->addDays(30);
        $this->save();

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

        // Let the merchant know their credits refreshed for the new cycle.
        \App\Services\EmailService::sendCreditsAdded($this, 'reset', null, (int) $newCredits);
    }

    /**
     * Check if credits need to be reset.
     *
     * credits_reset_at is the next scheduled refill timestamp; due when it
     * has passed. Stores without a paid plan never refill.
     */
    public function shouldResetCredits(): bool
    {
        if (!$this->plan) {
            return false;
        }

        return $this->credits_reset_at === null
            || Carbon::now()->gte($this->credits_reset_at);
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
     * Log credit usage. credits_before/credits_after hold the AVAILABLE
     * balance around the deduction so the log reads as a running balance.
     */
    protected function logCreditUsage(string $feature, int $creditsUsed, ?string $description = null, ?array $metadata = null, ?int $creditsBefore = null): void
    {
        $availableAfter = $this->credits - $this->credits_used;

        CreditUsageLog::create([
            'user_id' => $this->id,
            'feature' => $feature,
            'credits_used' => $creditsUsed,
            'credits_before' => $creditsBefore ?? $availableAfter + $creditsUsed,
            'credits_after' => $availableAfter,
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

    /**
     * Check if user has zero credits (for redirect logic)
     */
    public function hasZeroCredits(): bool
    {
        if ($this->hasUnlimitedCredits()) {
            return false;
        }

        return $this->getAvailableCredits() <= 0;
    }
}
