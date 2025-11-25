<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Barcode extends Model
{
    protected $fillable = [
        'product_id',
        'barcode_value',
        'format',
        'image_url',
        'is_duplicate'
    ];

    // ADD THIS
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id', 'shopify_id');
    }
}
