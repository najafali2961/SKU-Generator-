<?php

namespace App\Filament\Resources\Users\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;
use Filament\Forms\Components\Select; // ← This is the correct component for belongsTo

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')
                ->label('Shop Domain')
                ->disabled()
                ->dehydrated(false),

            TextInput::make('email')
                ->email()
                ->maxLength(255),

            Select::make('plan_id')
                ->label('Current Plan')
                ->relationship('plan', 'name') // Uses the plan relationship on User model
                ->searchable()
                ->preload()
                ->nullable()
                ->placeholder('Free Plan'),

            Toggle::make('shopify_freemium')
                ->label('Free Plan Active'),

            TextInput::make('credits')
                ->numeric()
                ->minValue(0)
                ->default(0),

            TextInput::make('credits_used')
                ->numeric()
                ->minValue(0)
                ->default(0),
        ]);
    }
}
