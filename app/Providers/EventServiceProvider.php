<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Osiset\ShopifyApp\Messaging\Events\PlanActivatedEvent;
use Osiset\ShopifyApp\Messaging\Events\AppInstalledEvent;
use App\Listeners\PlanActivatedListener;
use App\Listeners\AssignDefaultPlanOnInstall;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array
     */
    protected $listen = [
        // Plan activation event
        PlanActivatedEvent::class => [
            PlanActivatedListener::class,
        ],

        // App installation event
        AppInstalledEvent::class => [
            AssignDefaultPlanOnInstall::class,
        ],
    ];

    /**
     * Register any events for your application.
     *
     * @return void
     */
    public function boot()
    {
        parent::boot();
    }
}
