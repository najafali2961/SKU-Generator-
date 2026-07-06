<?php

namespace App\Filament\Resources\PlanChangeLogs\Pages;

use App\Filament\Resources\PlanChangeLogs\PlanChangeLogResource;
use Filament\Resources\Pages\ListRecords;

class ListPlanChangeLogs extends ListRecords
{
    protected static string $resource = PlanChangeLogResource::class;
}
