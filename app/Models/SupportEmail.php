<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportEmail extends Model
{
    protected $fillable = [
        'imap_uid',
        'from_email',
        'from_name',
        'subject',
        'body_text',
        'body_html',
        'date',
        'is_read',
    ];

    protected $casts = [
        'date' => 'datetime',
        'is_read' => 'boolean',
    ];
}
