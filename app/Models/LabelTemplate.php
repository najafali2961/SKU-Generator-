<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabelTemplate extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'description',
        'settings',
        'is_default'
    ];

    protected $casts = [
        'settings' => 'array',
        'is_default' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
