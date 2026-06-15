<?php

namespace App\Filament\Widgets;

use App\Models\JobLog;
use App\Models\Product;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StoreStatsOverview extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $total = User::withTrashed()->count();
        $installed = User::count();
        $uninstalled = User::onlyTrashed()->count();
        $newThisMonth = User::withTrashed()->where('created_at', '>=', now()->startOfMonth())->count();

        $jobsRun = JobLog::count();
        $itemsProcessed = (int) JobLog::sum('processed_items');
        $jobsThisMonth = JobLog::where('created_at', '>=', now()->startOfMonth())->count();

        $productsSynced = Product::count();
        $paid = User::whereNotNull('plan_id')->count();

        // 7-day install sparkline (oldest -> newest).
        $sparkline = collect(range(6, 0))
            ->map(fn (int $daysAgo): int => User::withTrashed()
                ->whereDate('created_at', now()->subDays($daysAgo)->toDateString())
                ->count())
            ->all();

        $retention = $total > 0 ? round(($installed / $total) * 100) : 0;
        $paidPct = $installed > 0 ? round(($paid / $installed) * 100) : 0;

        return [
            Stat::make('Total stores', $total)
                ->description($newThisMonth . ' new this month')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->chart($sparkline)
                ->color('primary'),

            Stat::make('Installed', $installed)
                ->description($retention . '% of all stores active')
                ->icon('heroicon-o-check-circle')
                ->color('success'),

            Stat::make('Uninstalled', $uninstalled)
                ->description('Churned stores')
                ->icon('heroicon-o-x-circle')
                ->color('danger'),

            Stat::make('Bulk jobs run', number_format($jobsRun))
                ->description(number_format($itemsProcessed) . ' items processed')
                ->icon('heroicon-o-queue-list')
                ->color('info'),

            Stat::make('Products synced', number_format($productsSynced))
                ->description('Across all stores')
                ->icon('heroicon-o-cube'),

            Stat::make('Paid stores', $paid)
                ->description($paidPct . '% of installed')
                ->icon('heroicon-o-banknotes')
                ->color('warning'),

            Stat::make('Jobs this month', number_format($jobsThisMonth))
                ->description('Since ' . now()->startOfMonth()->format('M j'))
                ->icon('heroicon-o-calendar-days'),
        ];
    }
}
