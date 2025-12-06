<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Collection extends Model
{
    protected $fillable = [
        'user_id',
        'shopify_id',
        'title',
        'handle',
        'description',
    ];

    /**
     * Get the user that owns this collection
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all products in this collection
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(
            Product::class,
            'collection_product',
            'collection_id',
            'product_id'
        )->withTimestamps();
    }
}
