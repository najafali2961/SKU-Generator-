<?php

namespace App\Filament\Resources\Plans\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class PlanForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),

                Select::make('type')
                    ->options([
                        'recurring' => 'Recurring',
                        'onetime'   => 'Onetime',
                    ])
                    ->required(),

                TextInput::make('price')
                    ->numeric()
                    ->prefix('$')
                    ->required()
                    ->minValue(0),

                TextInput::make('interval')
                    ->maxLength(255)
                    ->default('every_30_days')
                    ->helperText('e.g., every_30_days, monthly, annual'),

                TextInput::make('capped_amount')
                    ->numeric()
                    ->prefix('$')
                    ->nullable()
                    ->helperText('For usage-based billing cap'),

                TextInput::make('terms')
                    ->maxLength(255)
                    ->nullable()
                    ->helperText('e.g., "$0.50 per extra label after 1000"'),

                TextInput::make('trial_days')
                    ->numeric()
                    ->minValue(0)
                    ->nullable()
                    ->helperText('Number of free trial days'),

                Toggle::make('test')
                    ->label('Test Plan')
                    ->helperText('Only visible in test mode'),

                Toggle::make('on_install')
                    ->label('Charge on Install')
                    ->helperText('One-time charge when app is installed'),
            ]);
    }
}
