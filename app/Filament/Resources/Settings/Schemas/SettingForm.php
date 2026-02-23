<?php

namespace App\Filament\Resources\Settings\Schemas;

use Filament\Schemas\Schema;

class SettingForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                \Filament\Schemas\Components\TextInput::make('key')
                    ->required()
                    ->unique(ignoreRecord: true)
                    ->maxLength(255),
                \Filament\Schemas\Components\Textarea::make('value')
                    ->nullable()
                    ->columnSpanFull(),
            ]);
    }
}
