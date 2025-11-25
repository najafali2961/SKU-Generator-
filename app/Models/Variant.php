<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Variant extends Model
{
    protected $fillable = [
        'product_id',
        'shopify_variant_id',
        'title',
        'sku',
        'barcode',
        'option1',
        'option2',
        'option3',
        'price',
        'inventory_quantity',
        'image',        // ← add this
        'image_alt',
    ];

    protected $casts = [
        'sku' => 'string',
        'price' => 'decimal:2',
        'inventory_quantity' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function barcode()
    {
        return $this->hasOne(Barcode::class, 'variant_id', 'shopify_variant_id');
    }
}
