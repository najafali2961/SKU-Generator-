<?php

namespace App\Filament\Resources\SupportEmails\Pages;

use App\Filament\Resources\SupportEmails\SupportEmailResource;
use Filament\Actions\EditAction;
use Filament\Resources\Pages\ViewRecord;

class ViewSupportEmail extends ViewRecord
{
    protected static string $resource = SupportEmailResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}
