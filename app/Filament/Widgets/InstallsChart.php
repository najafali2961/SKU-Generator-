<?php

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\ChartWidget;

class InstallsChart extends ChartWidget
{
    protected ?string $heading = 'Installs vs. uninstalls (last 12 months)';

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected ?string $maxHeight = '300px';

    protected function getData(): array
    {
        $labels = [];
        $installs = [];
        $uninstalls = [];

        foreach (range(11, 0) as $monthsAgo) {
            $start = now()->subMonths($monthsAgo)->startOfMonth();
            $end = (clone $start)->endOfMonth();

            $labels[] = $start->format('M Y');

            $installs[] = User::withTrashed()
                ->whereBetween('created_at', [$start, $end])
                ->count();

            $uninstalls[] = User::onlyTrashed()
                ->whereBetween('deleted_at', [$start, $end])
                ->count();
        }

        return [
            'datasets' => [
                [
                    'label' => 'Installs',
                    'data' => $installs,
                    'borderColor' => '#8b5cf6',
                    'backgroundColor' => 'rgba(139, 92, 246, 0.15)',
                    'fill' => true,
                    'tension' => 0.3,
                ],
                [
                    'label' => 'Uninstalls',
                    'data' => $uninstalls,
                    'borderColor' => '#9ca3af',
                    'backgroundColor' => 'rgba(156, 163, 175, 0.15)',
                    'fill' => true,
                    'tension' => 0.3,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
