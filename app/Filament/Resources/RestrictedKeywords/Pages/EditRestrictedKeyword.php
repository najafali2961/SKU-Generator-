<?php

namespace App\Filament\Resources\RestrictedKeywords\Pages;

use App\Filament\Resources\RestrictedKeywords\RestrictedKeywordResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditRestrictedKeyword extends EditRecord
{
    protected static string $resource = RestrictedKeywordResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
