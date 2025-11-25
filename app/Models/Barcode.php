<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barcode extends Model
{
    protected $fillable = [
        'product_id',
        'variant_id',        // ← Shopify variant ID
        'barcode_value',
        'format',
        'image_url',
        'is_duplicate',
    ];

    public function variant()
    {
        return $this->belongsTo(Variant::class, 'variant_id', 'shopify_variant_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
