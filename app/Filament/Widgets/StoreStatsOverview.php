<?php

namespace App\Filament\Widgets;

use App\Models\StoreDetail;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\DB;

class StoreStatsOverview extends BaseWidget
{
    protected static ?int $sort = 2;

    protected function getStats(): array
    {
        $topCountry = StoreDetail::select('country', DB::raw('count(*) as total'))
            ->groupBy('country')
            ->orderByDesc('total')
            ->first();

        $mostCommonPlan = StoreDetail::select('plan_name', DB::raw('count(*) as total'))
            ->groupBy('plan_name')
            ->orderByDesc('total')
            ->first();

        return [
            Stat::make('Total Stores', StoreDetail::count())
                ->icon('heroicon-o-building-storefront')
                ->description('All connected stores')
                ->chart([7, 2, 10, 3, 15, 4, 17])
                ->color('success'),
            
            Stat::make('Plus Merchants', StoreDetail::where('shopify_plus', true)->orWhere('shopify_plus', '1')->count())
                ->icon('heroicon-o-star')
                ->color('warning'),

            Stat::make('Top Country', $topCountry ? $topCountry->country : 'N/A')
                ->icon('heroicon-o-globe-americas')
                ->description($topCountry ? $topCountry->total . ' stores' : ''),
                
            Stat::make('Most Common Plan', $mostCommonPlan ? $mostCommonPlan->plan_name : 'N/A')
                 ->icon('heroicon-o-currency-dollar')
                 ->description($mostCommonPlan ? $mostCommonPlan->total . ' stores' : ''),
        ];
    }
}
