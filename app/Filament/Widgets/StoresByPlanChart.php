<?php

namespace App\Filament\Widgets;

use App\Models\StoreDetail;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class StoresByPlanChart extends ChartWidget
{
    protected ?string $heading = 'Stores by Plan';
    
    protected static ?int $sort = 3;

    protected function getData(): array
    {
        $data = StoreDetail::select('plan_name', DB::raw('count(*) as total'))
            ->groupBy('plan_name')
            ->pluck('total', 'plan_name')
            ->all();

        return [
            'datasets' => [
                [
                    'label' => 'Stores',
                    'data' => array_values($data),
                    'backgroundColor' => [
                        '#10b981', // emerald-500
                        '#3b82f6', // blue-500
                        '#f59e0b', // amber-500
                        '#ef4444', // red-500
                        '#8b5cf6', // violet-500
                        '#64748b', // slate-500
                    ],
                ],
            ],
            'labels' => array_keys($data),
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
