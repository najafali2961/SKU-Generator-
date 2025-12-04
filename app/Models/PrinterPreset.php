<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrinterPreset extends Model
{
    protected $fillable = [
        'name',
        'brand',
        'type',
        'settings',
        'supported_label_sizes',
        'is_system',
    ];

    protected $casts = [
        'settings' => 'array',
        'supported_label_sizes' => 'array',
        'is_system' => 'boolean',
    ];
}
