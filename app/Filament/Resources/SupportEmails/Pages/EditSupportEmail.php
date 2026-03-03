<?php

namespace App\Filament\Resources\SupportEmails\Pages;

use App\Filament\Resources\SupportEmails\SupportEmailResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditSupportEmail extends EditRecord
{
    protected static string $resource = SupportEmailResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
