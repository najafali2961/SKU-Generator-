<?php

namespace App\Filament\Widgets;

use App\Models\User;
use Osiset\ShopifyApp\Storage\Models\Plan;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class UsersPlansStats extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        return [
            Stat::make('Total Users', User::count())
                ->icon('heroicon-o-users')
                ->color('primary'),

            Stat::make('Paid Users', User::whereNotNull('plan_id')->count())
                ->icon('heroicon-o-credit-card')
                ->color('success'),

            Stat::make('Freemium Users', User::whereNull('plan_id')->count())
                ->icon('heroicon-o-user-minus')
                ->color('warning'),

            Stat::make('Total Plans', Plan::count())
                ->icon('heroicon-o-briefcase')
                ->color('info'),

            // Stat::make('Unlimited Plans', Plan::where('unlimited_credits', true)->count())
            //     ->icon('heroicon-o-infinity')
            //     ->color('success'),
        ];
    }
}
