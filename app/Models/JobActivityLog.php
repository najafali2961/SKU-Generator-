<?php

// app/Models/JobActivityLog.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobActivityLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'context' => 'array',
        'logged_at' => 'datetime',
    ];

    public function jobLog()
    {
        return $this->belongsTo(JobLog::class);
    }
}
