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

        return [
            'datasets' => [
                [
                    'label' => 'Users',
                    'data' => $plans->pluck('users_count')->toArray(),
                ],
            ],
            'labels' => $plans->pluck('name')->toArray(),
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
