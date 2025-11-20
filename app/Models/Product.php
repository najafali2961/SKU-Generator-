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
        'variants',
        'seo_title',
        'seo_description'
    ];

    protected $casts = [
        'tags' => 'array',
        'images' => 'array',
        'price' => 'decimal:2',
        'stock' => 'integer',
    ];


    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getTagsStringAttribute(): string
    {
        return is_array($this->tags) ? implode(', ', $this->tags) : '';
    }

    // public function variants()
    // {
    //     return $this->hasMany(Variant::class, 'product_id');
    // }
    // App/Models/Product.php

    public function variants()
    {
        return $this->hasMany(Variant::class, 'id', 'product_id');
    }
    public function variantspro()
    {
        return $this->hasMany(Variant::class, 'product_id', 'id');
    }
}
