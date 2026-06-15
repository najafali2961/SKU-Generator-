<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {

        // Web middleware stack
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            // Logs each auto-deploy into the admin "Deploy Log" the first time a
            // request is served after a new commit goes live. Runs in terminate().
            \App\Http\Middleware\RecordDeployment::class,
        ]);

        // Middleware alias registration (IMPORTANT: must be outside web())
        $middleware->alias([
            // 'check.credits' => \App\Http\Middleware\CheckCredits::class, // removed
        ]);

        // CSRF disabled for all routes (your previous config)
        $middleware->validateCsrfTokens(except: [
            '*',
        ]);

        // Send unauthenticated visitors (e.g. the admin-only /logs route) to the
        // Filament admin login rather than the non-existent default `login` route.
        $middleware->redirectGuestsTo(fn () => route('filament.admin.auth.login'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
