<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $fillable = [
        'user_id',
        'shopify_id',
        'title',
        'description_html',
        'status',
        'vendor',
        'product_type',
        'tags',
        'images',
    ];

    protected $casts = [
        'images' => 'array',
    ];

    /**
     * Get the user that owns this product
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all variants of this product
     */
    public function variants(): HasMany
    {
        return $this->hasMany(Variant::class, 'product_id', 'id');
    }

    /**
     * Get all collections this product belongs to
     */
    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(
            Collection::class,
            'collection_product',
            'product_id',
            'collection_id'
        )->withTimestamps();
    }

    /**
     * Get tags as string (for display purposes)
     */
    public function getTagsStringAttribute(): string
    {
        return is_array($this->tags) ? implode(', ', $this->tags) : ($this->tags ?? '');
    }

    /**
     * Alias for variants relationship
     */
    public function variantspro()
    {
        return $this->hasMany(Variant::class, 'product_id', 'id');
    }

    /**
     * Get all barcodes associated with this product
     */
    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'product_id', 'id');
    }
}
