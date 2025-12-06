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

        return response()->json([
            'progress_percentage' => $jobLog->progress_percentage,
            'processed_items'     => $jobLog->processed_items,
            'total_items'         => $jobLog->total_items ?? 0,
            'failed_items'        => $jobLog->failed_items ?? 0,
            'status'              => $jobLog->status,
            'error_message'       => $jobLog->error_message,
            'started_at'          => $jobLog->started_at?->toDateTimeString(),
            'finished_at'         => $jobLog->finished_at?->toDateTimeString(),
            'logs'                => $latestLogs->map(fn($log) => [
                'type'    => $log->level,
                'title'   => $log->title,
                'message' => $log->message,
                'time'    => $log->logged_at?->diffForHumans(),
            ])->reverse()->values(),
        ]);
    }
}
