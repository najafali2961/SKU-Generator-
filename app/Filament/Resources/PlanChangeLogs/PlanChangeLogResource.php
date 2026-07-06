<?php

namespace App\Filament\Resources\PlanChangeLogs;

use App\Filament\Resources\PlanChangeLogs\Pages\ListPlanChangeLogs;
use App\Models\PlanChangeLog;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

/**
 * Read-only audit trail of every plan transition: billing activations,
 * merchant cancels, admin overrides and uninstalls.
 */
class PlanChangeLogResource extends Resource
{
    protected static ?string $model = PlanChangeLog::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-clock';

    protected static string|UnitEnum|null $navigationGroup = 'Billing';

    protected static ?int $navigationSort = 4;

    protected static ?string $navigationLabel = 'Plan History';

    protected static ?string $modelLabel = 'Plan Change';

    protected static ?string $pluralModelLabel = 'Plan History';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('user.storeDetails');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('shop_domain')
                    ->label('Store')
                    ->state(fn (PlanChangeLog $record): ?string => $record->user?->storeDetails?->shop_name
                        ?: ($record->shop_domain ?: $record->user?->name))
                    ->description(fn (PlanChangeLog $record): ?string => $record->shop_domain)
                    ->searchable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('previous_plan_name')
                    ->label('From')
                    ->badge()
                    ->color('gray')
                    ->placeholder('Free'),

                TextColumn::make('new_plan_name')
                    ->label('To')
                    ->badge()
                    ->color(fn (PlanChangeLog $record): string => $record->new_plan_id ? 'success' : 'danger')
                    ->placeholder('Free'),

                TextColumn::make('price')
                    ->money('usd')
                    ->sortable(),

                TextColumn::make('interval')
                    ->label('Interval')
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'EVERY_30_DAYS' => 'Monthly',
                        'ANNUAL' => 'Annual',
                        default => $state ?: '—',
                    })
                    ->placeholder('—'),

                TextColumn::make('source')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        PlanChangeLog::SOURCE_BILLING => 'success',
                        PlanChangeLog::SOURCE_MERCHANT_CANCEL => 'danger',
                        PlanChangeLog::SOURCE_ADMIN => 'info',
                        PlanChangeLog::SOURCE_UNINSTALL => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => str_replace('_', ' ', ucfirst($state))),

                TextColumn::make('test')
                    ->label('Mode')
                    ->badge()
                    ->state(fn (PlanChangeLog $record): string => $record->test ? 'Test' : 'Live')
                    ->color(fn (string $state): string => $state === 'Test' ? 'warning' : 'success'),

                TextColumn::make('charge_id')
                    ->label('Charge ID')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('notes')
                    ->limit(40)
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('created_at')
                    ->label('When')
                    ->dateTime('M j, Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('source')
                    ->options([
                        PlanChangeLog::SOURCE_BILLING => 'Billing',
                        PlanChangeLog::SOURCE_MERCHANT_CANCEL => 'Merchant cancel',
                        PlanChangeLog::SOURCE_ADMIN => 'Admin',
                        PlanChangeLog::SOURCE_UNINSTALL => 'Uninstall',
                    ]),

                TernaryFilter::make('test')
                    ->label('Test charges'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPlanChangeLogs::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
