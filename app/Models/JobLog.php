<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'payload' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(JobActivityLog::class)->orderBy('logged_at', 'desc');
    }

    public function getProgressPercentageAttribute(): int
    {
        if (!$this->total_items || $this->total_items == 0) return 0;
        return min(100, (int) round(($this->processed_items / $this->total_items) * 100));
    }

    public function markAsStarted(): void
    {
        $this->update([
            'status' => 'running',
            'started_at' => now(),
        ]);
        $this->info('Job Started', 'SKU generation job has begun');
    }

    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'finished_at' => now(),
        ]);
        $this->success('Job Completed', 'All variants processed and synced successfully');
    }

    public function markAsFailed(string $message = null): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $message,
            'finished_at' => now(),
        ]);
        $this->error('Job Failed', $message ?? 'Unknown error occurred');
    }

    // Logging helpers
    public function log(string $level, string $title, string $message = null, array $context = []): void
    {
        $this->activityLogs()->create([
            'level' => $level,
            'title' => $title,
            'message' => $message,
            'context' => $context,
        ]);
    }

    public function info(string $title, string $message = null, array $context = []): void
    {
        $this->log('info', $title, $message, $context);
    }

    public function success(string $title, string $message = null, array $context = []): void
    {
        $this->log('success', $title, $message, $context);
    }

    public function warning(string $title, string $message = null, array $context = []): void
    {
        $this->log('warning', $title, $message, $context);
    }

    public function error(string $title, string $message = null, array $context = []): void
    {
        $this->log('error', $title, $message, $context);
    }
}
