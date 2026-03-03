<?php

namespace App\Filament\Resources\RestrictedKeywords\Pages;

use App\Filament\Resources\RestrictedKeywords\RestrictedKeywordResource;
use Filament\Resources\Pages\CreateRecord;

class CreateRestrictedKeyword extends CreateRecord
{
    protected static string $resource = RestrictedKeywordResource::class;
}
