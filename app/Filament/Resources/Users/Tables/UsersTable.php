<?php

namespace App\Filament\Resources\Users\Tables;

use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\SelectColumn;
use Filament\Tables\Table;
use Livewire\Attributes\Title;
use Osiset\ShopifyApp\Storage\Models\Plan;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->searchable()
                    ->sortable()
                    ->label('ID'),

                TextColumn::make('name')
                    ->label('Shop Domain')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('email')
                    ->searchable()
                    ->sortable(),

                SelectColumn::make('plan_id')
                    ->label('Plan')
                    ->options(function () {
                        $plans = Plan::pluck('name', 'id')->toArray();
                        return ['' => 'No Plan'] + $plans;
                    })
                    ->placeholder('No Plan')
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
