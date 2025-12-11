<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CreditUsageLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'feature',
        'credits_used',
        'credits_before',
        'credits_after',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'credits_used' => 'integer',
        'credits_before' => 'integer',
        'credits_after' => 'integer',
    ];

    /**
     * Get the user that owns the log
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope to filter by feature
     */
    public function scopeFeature($query, string $feature)
    {
        return $query->where('feature', $feature);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Get formatted feature name
     */
    public function getFormattedFeatureAttribute(): string
    {
        return str_replace('_', ' ', ucwords($this->feature, '_'));
    }
}
