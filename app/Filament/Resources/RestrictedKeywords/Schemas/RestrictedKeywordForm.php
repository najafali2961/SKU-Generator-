<?php

namespace App\Filament\Resources\RestrictedKeywords\Schemas;

use Filament\Schemas\Schema;

class RestrictedKeywordForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                \Filament\Forms\Components\TextInput::make('keyword')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
            ]);
    }
}
