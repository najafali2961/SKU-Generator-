<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Variant extends Model
{
    protected $fillable = ['product_id', 'shopify_variant_id', 'title', 'sku', 'option1', 'option2', 'option3', 'price', 'inventory_quantity'];

    protected $casts = ['sku' => 'string'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
