<?php

namespace App\Filament\Resources\Settings\Schemas;

use Filament\Forms\Form;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;

class SettingForm
{
    public static function configure(Form $form): Form
    {
        return $form
            ->schema([
                TextInput::make('key')
                    ->required()
                    ->unique(ignoreRecord: true)
                    ->maxLength(255),
                Textarea::make('value')
                    ->nullable()
                    ->columnSpanFull(),
            ]);
    }
}
