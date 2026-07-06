<?php

namespace App\Filament\Resources\Subscriptions;

use App\Filament\Resources\Subscriptions\Pages\ListSubscriptions;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Osiset\ShopifyApp\Storage\Models\Charge;
use UnitEnum;

class SubscriptionResource extends Resource
{
    protected static ?string $model = Charge::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-credit-card';

    protected static string|UnitEnum|null $navigationGroup = 'Billing';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Subscriptions';

    protected static ?string $modelLabel = 'Subscription';

    protected static function statusColor(?string $status): string
    {
        // The package stores statuses uppercase (ChargeStatus enum).
        return match (strtolower((string) $status)) {
            'active', 'accepted' => 'success',
            'pending' => 'warning',
            'declined', 'cancelled', 'expired', 'frozen' => 'danger',
            default => 'gray',
        };
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class])
            ->with(['plan', 'shop.storeDetails']);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('shop.name')
                    ->label('Store')
                    ->state(fn (Charge $record): ?string => $record->shop?->storeDetails?->shop_name ?: $record->shop?->name)
                    ->description(fn (Charge $record): ?string => $record->shop?->storeDetails?->shopify_domain ?: $record->shop?->name)
                    ->searchable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('plan.name')
                    ->label('Plan')
                    ->badge()
                    ->color('info')
                    ->placeholder('—'),

                TextColumn::make('status')
                    ->badge()
                    ->color(fn (?string $state): string => static::statusColor($state))
                    ->formatStateUsing(fn (?string $state): string => $state ? ucfirst(strtolower($state)) : '—'),

                TextColumn::make('type'),

                TextColumn::make('price')
                    ->money('usd')
                    ->sortable(),

                TextColumn::make('test')
                    ->label('Mode')
                    ->badge()
                    ->state(fn (Charge $record): string => $record->test ? 'Test' : 'Live')
                    ->color(fn (string $state): string => $state === 'Test' ? 'warning' : 'success'),

                TextColumn::make('trial_ends_on')
                    ->label('Trial ends')
                    ->date()
                    ->placeholder('—')
                    ->toggleable(),

                TextColumn::make('activated_on')
                    ->label('Activated')
                    ->date()
                    ->placeholder('—'),

                TextColumn::make('cancelled_on')
                    ->label('Cancelled')
                    ->date()
                    ->placeholder('—')
                    ->color('danger')
                    ->toggleable(),

                TextColumn::make('created_at')
                    ->label('Started')
                    ->dateTime('M j, Y')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'active' => 'Active',
                        'accepted' => 'Accepted',
                        'pending' => 'Pending',
                        'declined' => 'Declined',
                        'cancelled' => 'Cancelled',
                        'expired' => 'Expired',
                        'frozen' => 'Frozen',
                    ]),

                SelectFilter::make('plan_id')
                    ->label('Plan')
                    ->relationship('plan', 'name'),

                TernaryFilter::make('test')
                    ->label('Mode')
                    ->placeholder('All')
                    ->trueLabel('Test')
                    ->falseLabel('Live'),
            ])
            ->recordActions([
                ViewAction::make()->slideOver(),
            ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Subscription')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('shop.name')
                            ->label('Store')
                            ->state(fn (Charge $record): ?string => $record->shop?->storeDetails?->shop_name ?: $record->shop?->name),
                        TextEntry::make('plan.name')->label('Plan')->badge()->color('info')->placeholder('—'),
                        TextEntry::make('status')
                            ->badge()
                            ->color(fn (?string $state): string => static::statusColor($state))
                            ->formatStateUsing(fn (?string $state): string => $state ? ucfirst($state) : '—'),
                        TextEntry::make('type'),
                        TextEntry::make('price')->money('usd'),
                        TextEntry::make('interval')->placeholder('—'),
                        TextEntry::make('capped_amount')->money('usd')->placeholder('—'),
                        IconEntry::make('test')->label('Test mode')->boolean(),
                        TextEntry::make('charge_id')->label('Shopify charge ID')->copyable(),
                    ]),

                Section::make('Lifecycle')
                    ->columns(3)
                    ->schema([
                        TextEntry::make('created_at')->label('Started')->dateTime(),
                        TextEntry::make('activated_on')->label('Activated')->dateTime()->placeholder('—'),
                        TextEntry::make('billing_on')->label('Next billing')->dateTime()->placeholder('—'),
                        TextEntry::make('trial_days')->label('Trial days')->placeholder('0'),
                        TextEntry::make('trial_ends_on')->label('Trial ends')->dateTime()->placeholder('—'),
                        TextEntry::make('cancelled_on')->label('Cancelled')->dateTime()->placeholder('—'),
                        TextEntry::make('expires_on')->label('Expires')->dateTime()->placeholder('—'),
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListSubscriptions::route('/'),
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
