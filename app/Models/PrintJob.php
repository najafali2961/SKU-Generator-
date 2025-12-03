<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrintJob extends Model
{
    protected $fillable = [
        'user_id',
        'barcode_printer_setting_id',
        'selected_variants',
        'quantity_per_variant',
        'total_labels',
        'status',
        'error_message',
        'scheduled_at',
        'started_at',
        'completed_at'
    ];

    protected $casts = [
        'selected_variants' => 'array',
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function barcodePrinterSetting(): BelongsTo
    {
        return $this->belongsTo(BarcodePrinterSetting::class);
    }
}
