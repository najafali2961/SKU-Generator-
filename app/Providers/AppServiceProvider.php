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
        // Per-store billing test mode: dev stores get test charges, every
        // real store gets a live charge. This bind overrides the package's
        // own ChargeHelper binding (app providers register after packages).
        // NOTE: requires an Octane restart on deploy to take effect.
        $this->app->bind(
            \Osiset\ShopifyApp\Services\ChargeHelper::class,
            \App\Services\DevAwareChargeHelper::class
        );
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
