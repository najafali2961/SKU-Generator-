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
