<?php

namespace App\Filament\Resources\SupportEmails\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\ViewField;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SupportEmailForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Email Details')
                    ->schema([
                        TextInput::make('from_name')
                            ->label('From Name')
                            ->disabled(),

                        TextInput::make('from_email')
                            ->label('From Email')
                            ->disabled(),

                        TextInput::make('subject')
                            ->label('Subject')
                            ->disabled()
                            ->columnSpanFull(),

                        DateTimePicker::make('date')
                            ->label('Date Received')
                            ->disabled(),
                    ])
                    ->columns(2)
                    ->columnSpanFull(),

                Section::make('Message')
                    ->schema([
                        ViewField::make('body_html')
                            ->view('filament.forms.components.email-body-view')
                            ->columnSpanFull()
                            ->hiddenLabel(),
                    ])
                    ->columnSpanFull(),
            ]);
    }
}