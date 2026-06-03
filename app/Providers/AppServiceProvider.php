<?php

namespace App\Providers;

use App\Models\Setting;
use App\Models\User;                  // <-- Add this
use App\Observers\SettingObserver;
use App\Observers\UserObserver;     // <-- Add this
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        User::observe(UserObserver::class);
        Setting::observe(SettingObserver::class);
    }
}
