<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Refill paid stores' monthly credit allowances when their cycle is due.
// Requires the system cron to run `php artisan schedule:run` every minute.
Schedule::command('credits:reset-monthly')
    ->hourly()
    ->withoutOverlapping();
