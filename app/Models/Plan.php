<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Osiset\ShopifyApp\Storage\Models\Plan as BasePlan;

/**
 * App-level plan model.
 *
 * The vendor Plan model only knows the stock billing columns. All of the
 * app's custom columns (credits, visibility, description) and relations live
 * here so `composer install` can never wipe them out again (the vendor file
 * used to be hand-edited in place). Wired up via config/shopify-app.php
 * `models.plan`, so the package billing flow resolves this class too.
 */
class Plan extends BasePlan
{
    protected $fillable = [
        'type',
        'name',
        'is_visible',
        'price',
        'monthly_credits',
        'unlimited_credits',
        'description',
        'interval',
        'capped_amount',
        'terms',
        'trial_days',
        'test',
        'on_install',
    ];

    protected $casts = [
        'test' => 'bool',
        'on_install' => 'bool',
        'is_visible' => 'bool',
        'capped_amount' => 'float',
        'price' => 'float',
        'monthly_credits' => 'integer',
        'unlimited_credits' => 'boolean',
    ];

    public function features(): BelongsToMany
    {
        return $this->belongsToMany(Feature::class, 'plan_features');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
