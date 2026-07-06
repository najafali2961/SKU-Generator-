<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable audit record of every plan transition a store goes through:
 * billing activations, merchant cancellations, admin overrides, uninstalls.
 * Plan names/prices are snapshotted so history stays readable even if the
 * plan row is later edited or deleted.
 */
class PlanChangeLog extends Model
{
    protected $fillable = [
        'user_id',
        'shop_domain',
        'previous_plan_id',
        'previous_plan_name',
        'new_plan_id',
        'new_plan_name',
        'price',
        'interval',
        'source',
        'test',
        'charge_id',
        'notes',
    ];

    protected $casts = [
        'price' => 'float',
        'test' => 'boolean',
    ];

    public const SOURCE_BILLING = 'billing';
    public const SOURCE_MERCHANT_CANCEL = 'merchant_cancel';
    public const SOURCE_ADMIN = 'admin';
    public const SOURCE_UNINSTALL = 'uninstall';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /**
     * Write a plan-transition record. Never throws — audit logging must not
     * break the billing flow itself.
     */
    public static function record(
        User $user,
        ?Plan $previousPlan,
        ?Plan $newPlan,
        string $source,
        bool $test = false,
        ?string $chargeId = null,
        ?string $notes = null
    ): void {
        try {
            static::create([
                'user_id' => $user->id,
                'shop_domain' => $user->name,
                'previous_plan_id' => $previousPlan?->id,
                'previous_plan_name' => $previousPlan?->name ?? 'Free',
                'new_plan_id' => $newPlan?->id,
                'new_plan_name' => $newPlan?->name ?? 'Free',
                'price' => $newPlan?->price ?? 0,
                'interval' => $newPlan?->interval,
                'source' => $source,
                'test' => $test,
                'charge_id' => $chargeId,
                'notes' => $notes,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Failed to record plan change', [
                'user_id' => $user->id,
                'source' => $source,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
