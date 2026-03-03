<?php

namespace App\Filament\Resources\SupportEmails\Pages;

use App\Filament\Resources\SupportEmails\SupportEmailResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListSupportEmails extends ListRecords
{
    protected static string $resource = SupportEmailResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
