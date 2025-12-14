<?php

namespace App\Filament\Resources\Users\Tables;

use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label('Shop Domain')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('email')
                    ->searchable()
                    ->sortable(),

                TextColumn::make('plan.name')
                    ->badge()
                    ->color('success')
                    ->default('Free')
                    ->sortable(),

                IconColumn::make('shopify_freemium')
                    ->label('Freemium')
                    ->boolean(),

                TextColumn::make('credits')
                    ->numeric()
                    ->sortable(),

                TextColumn::make('credits_used')
                    ->numeric()
                    ->sortable(),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ]);
    }
}
