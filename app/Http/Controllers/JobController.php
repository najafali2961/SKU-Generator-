<?php

namespace App\Http\Controllers;

use App\Models\JobLog;
use Inertia\Inertia;

class JobController extends Controller
{
    public function show(JobLog $jobLog)
    {
        if ($jobLog->user_id !== auth()->id()) {
            abort(403);
        }

        $jobLog->load(['activityLogs' => fn($q) => $q->latest('logged_at')->take(200)]);

        return Inertia::render('Jobs/Show', [
            'job' => $jobLog
        ]);
    }

    /**
     * Get recent jobs for the authenticated user only
     */
    public function index()
    {
        // ✅ FIX: Filter by authenticated user
        $jobs = JobLog::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('History', [
            'jobs' => $jobs
        ]);
    }

    /**
     * Get jobs for home dashboard (recent jobs widget)
     * Used by HomeController
     */
    public function getRecentJobs($limit = 5)
    {
        // ✅ Filter by authenticated user and limit results
        return JobLog::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    public function progress(JobLog $jobLog)
    {
        if ($jobLog->user_id !== auth()->id()) {
            abort(403);
        }

        $latestLogs = $jobLog->activityLogs()
            ->select('level', 'title', 'message', 'logged_at')
            ->latest('logged_at')
            ->take(100)
            ->get();

        // READ PROGRESS FROM REDIS (High Speed, No Locks)
        $redisKeyProcessed = "job_progress_{$jobLog->id}";
        $redisKeyFailed    = "job_failed_{$jobLog->id}";
        
        // Get live values from Redis if available, otherwise fallback to DB
        $liveProcessed = (int) \Illuminate\Support\Facades\Redis::get($redisKeyProcessed);
        $liveFailed    = (int) \Illuminate\Support\Facades\Redis::get($redisKeyFailed);

        // If job is running, Redis is the source of truth for "processed". 
        // If job is done, DB (which should be updated at the very end) is source, 
        // BUT we must ensure the final sync happened.
        // For now, let's max() them to be safe.
        $processed = max($jobLog->processed_items, $liveProcessed);
        $failed    = max($jobLog->failed_items, $liveFailed);
        
        // Calculate percentage dynamically
        $total = $jobLog->total_items > 0 ? $jobLog->total_items : 1;
        $pct = min(100, (int) round(($processed / $total) * 100));

        return response()->json([
            'progress_percentage' => $pct,
            'processed_items'     => $processed,
            'total_items'         => $jobLog->total_items ?? 0,
            'failed_items'        => $failed,
            'status'              => $jobLog->status,
            'error_message'       => $jobLog->error_message,
            'started_at'          => $jobLog->started_at?->toDateTimeString(),
            'finished_at'         => $jobLog->finished_at?->toDateTimeString(),
            'payload'             => $jobLog->payload,
            'logs'                => $latestLogs->map(fn($log) => [
                'type'    => $log->level,
                'title'   => $log->title,
                'message' => $log->message,
                'time'    => $log->logged_at?->diffForHumans(),
            ])->values(),
        ]);
    }
}
