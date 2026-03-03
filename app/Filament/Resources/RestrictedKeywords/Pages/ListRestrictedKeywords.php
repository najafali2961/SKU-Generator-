<?php

namespace App\Filament\Resources\RestrictedKeywords\Pages;

use App\Filament\Resources\RestrictedKeywords\RestrictedKeywordResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListRestrictedKeywords extends ListRecords
{
    protected static string $resource = RestrictedKeywordResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
