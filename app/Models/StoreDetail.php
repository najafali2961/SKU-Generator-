<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreDetail extends Model
{
    protected $table = 'store_details';

    protected $fillable = [
        'shop_id',
        'shop_name',
        'email',
        'phone',
        'description',
        'plan_name',
        'partner_development',
        'shopify_plus',
        'shopify_domain',
        'primary_domain',
        'country',
        'currency',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'partner_development' => 'boolean',
    ];

    /**
     * Get the user that owns the store detail.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}