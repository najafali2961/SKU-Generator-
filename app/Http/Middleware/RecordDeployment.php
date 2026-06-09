<?php

namespace App\Http\Middleware;

use App\Services\DeploymentRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Terminable middleware that logs a deployment the first time a request is
 * served after a new commit goes live. Runs in terminate() — after the response
 * is sent — so it adds no latency to the request itself.
 */
class RecordDeployment
{
    public function __construct(private DeploymentRecorder $recorder) {}

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->recorder->recordIfChanged('auto');
    }
}
