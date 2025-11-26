<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'tags' => 'array',
        'images' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function variants()
    {
        return $this->hasMany(Variant::class, 'product_id', 'id');
    }

    public function getTagsStringAttribute(): string
    {
        return is_array($this->tags) ? implode(', ', $this->tags) : '';
    }

    public function variantspro()
    {
        return $this->hasMany(Variant::class, 'product_id', 'id');
    }
    public function barcodes()
    {
        return $this->hasMany(Barcode::class, 'product_id', 'shopify_id');
    }
}
