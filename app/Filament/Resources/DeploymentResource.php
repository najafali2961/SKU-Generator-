<?php

namespace App\Filament\Resources;

use App\Filament\Resources\DeploymentResource\Pages;
use App\Models\Deployment;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class DeploymentResource extends Resource
{
    protected static ?string $model = Deployment::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::RocketLaunch;

    protected static string|UnitEnum|null $navigationGroup = 'System';

    protected static ?string $navigationLabel = 'Deploy Log';

    protected static ?string $modelLabel = 'Deployment';

    protected static ?int $navigationSort = 99;

    public static function getNavigationBadge(): ?string
    {
        return (string) static::getModel()::count();
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('deployed_at', 'desc')
            ->poll('30s')
            ->columns([
                TextColumn::make('deployed_at')
                    ->label('Deployed')
                    ->dateTime('M j, Y · H:i')
                    ->description(fn (Deployment $record): ?string => $record->deployed_at?->diffForHumans())
                    ->sortable(),
                TextColumn::make('live')
                    ->label('')
                    ->state(fn (Deployment $record): ?string => $record->getKey() === static::liveId() ? 'LIVE' : null)
                    ->badge()
                    ->color('success'),
                TextColumn::make('commit_short')
                    ->label('Commit')
                    ->badge()
                    ->color('gray')
                    ->copyable()
                    ->copyableState(fn (Deployment $record): string => $record->commit_hash)
                    ->tooltip(fn (Deployment $record): string => $record->commit_hash),
                TextColumn::make('commit_subject')
                    ->label('Message')
                    ->limit(70)
                    ->tooltip(fn (Deployment $record): ?string => $record->commit_subject)
                    ->wrap(),
                TextColumn::make('commit_author')
                    ->label('Author')
                    ->toggleable(),
                TextColumn::make('branch')
                    ->badge()
                    ->color('info'),
                TextColumn::make('source')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'webhook' => 'success',
                        'manual' => 'warning',
                        default => 'gray',
                    })
                    ->toggleable(),
                TextColumn::make('committed_at')
                    ->label('Committed')
                    ->dateTime('M j, Y · H:i')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('php_version')
                    ->label('PHP')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('laravel_version')
                    ->label('Laravel')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->recordActions([])
            ->toolbarActions([]);
    }

    /**
     * The id of the commit currently live (most recently deployed). Memoised per
     * request via once() so the "LIVE" badge column doesn't query once per row.
     */
    protected static function liveId(): ?int
    {
        return once(fn (): ?int => Deployment::query()->latest('deployed_at')->value('id'));
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListDeployments::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }
}
