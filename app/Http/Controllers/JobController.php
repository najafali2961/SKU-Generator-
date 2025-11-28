<?php
// app/Http/Controllers/JobController.php

namespace App\Http\Controllers;

use App\Models\JobLog;
use Inertia\Inertia;

class JobController extends Controller
{
    public function index()
    {
        $jobs = auth()->user()->jobLogs()
            ->where('type', 'sku_generation')
            ->latest()
            ->paginate(20);

        return Inertia::render('Jobs/Index', [
            'jobs' => $jobs
        ]);
    }

    public function show(JobLog $jobLog)
    {
        if ($jobLog->user_id !== auth()->id()) {
            abort(403);
        }

        return Inertia::render('Jobs/Show', [
            'job' => $jobLog
        ]);
    }



    public function progress(JobLog $jobLog)
    {
        if ($jobLog->user_id !== auth()->id()) {
            abort(403);
        }

        return response()->json([
            'progress_percentage' => $jobLog->progress_percentage,
            'processed_items'     => $jobLog->processed_items,
            'total_items'         => $jobLog->total_items ?? 0,
            'status'              => $jobLog->status,
            'error_message'       => $jobLog->error_message,
            'started_at'          => $jobLog->started_at?->toDateTimeString(),
            'finished_at'         => $jobLog->finished_at?->toDateTimeString(),
        ]);
    }
}
