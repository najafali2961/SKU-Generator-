<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Deployment extends Model
{
    protected $fillable = [
        'commit_hash',
        'commit_short',
        'commit_subject',
        'commit_author',
        'branch',
        'committed_at',
        'php_version',
        'laravel_version',
        'source',
        'deployed_at',
    ];

    protected $casts = [
        'committed_at' => 'datetime',
        'deployed_at' => 'datetime',
    ];
}
