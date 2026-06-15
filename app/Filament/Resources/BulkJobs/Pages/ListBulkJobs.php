<?php

namespace App\Filament\Resources\BulkJobs\Pages;

use App\Filament\Resources\BulkJobs\BulkJobResource;
use Filament\Resources\Pages\ListRecords;

class ListBulkJobs extends ListRecords
{
    protected static string $resource = BulkJobResource::class;
}
