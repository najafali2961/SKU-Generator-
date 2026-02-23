<?php

namespace App\Filament\Resources\Plans\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\BooleanColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class PlansTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('type')
                    ->badge()
                    ->color(fn(string $state): string => match ($state) {
                        'recurring' => 'success',
                        'onetime'   => 'info',
                        default     => 'gray',
                    })
                    ->formatStateUsing(fn(string $state): string => ucfirst($state)),

                TextColumn::make('price')
                    ->money('usd')
                    ->sortable(),

                TextColumn::make('interval')
                    ->placeholder('—'),

                TextColumn::make('trial_days')
                    ->suffix(' days')
                    ->placeholder('No trial')
                    ->alignCenter(),

                ToggleColumn::make('is_visible')
                    ->label('Visible'),

                BooleanColumn::make('test')
                    ->label('Test'),

                BooleanColumn::make('on_install')
                    ->label('On Install'),
            ])
            ->filters([
                SelectFilter::make('type')
                    ->options([
                        'recurring' => 'Recurring',
                        'onetime'   => 'Onetime',
                    ]),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
