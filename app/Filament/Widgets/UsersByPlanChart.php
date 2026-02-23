<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Osiset\ShopifyApp\Storage\Models\Plan;

class UsersByPlanChart extends ChartWidget
{
    protected static ?int $sort = 2;



    protected function getData(): array
    {
        $plans = Plan::withCount('users')->get();
        $freemiumCount = \App\Models\User::whereNull('plan_id')->count();

        $labels = $plans->pluck('name')->toArray();
        $data = $plans->pluck('users_count')->toArray();

        // Add Freemium to the beginning
        array_unshift($labels, 'Free Plan');
        array_unshift($data, $freemiumCount);

        return [
            'datasets' => [
                [
                    'label' => 'Users',
                    'data' => $data,
                    'backgroundColor' => [
                        '#9ca3af', // gray-400 (Freemium)
                        '#3b82f6', // blue-500
                        '#10b981', // emerald-500
                        '#f59e0b', // amber-500
                        '#ef4444', // red-500
                    ],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
