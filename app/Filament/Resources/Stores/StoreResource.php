<?php

namespace App\Filament\Resources\Stores;

use App\Filament\Resources\Stores\Pages\ListStores;
use App\Models\User;
use App\Services\StoreDetailService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ViewColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use UnitEnum;

class StoreResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-building-storefront';

    protected static string|UnitEnum|null $navigationGroup = 'Store Management';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'Store Details';

    protected static ?string $modelLabel = 'Store';

    protected static ?string $pluralModelLabel = 'Store Details';

    protected static ?string $recordTitleAttribute = 'name';

    /**
     * Show uninstalled (soft-deleted) shops too, and preload the data the
     * table/infolist need so we don't N+1 per row.
     */
    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class])
            ->with(['storeDetails', 'plan'])
            ->withCount(['jobLogs', 'products']);
    }

    public static function getNavigationBadge(): ?string
    {
        // Installed = not soft-deleted (default scope counts those only).
        return (string) static::getModel()::count();
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('storeDetails.shop_name')
                    ->label('Shop')
                    ->searchable()
                    ->formatStateUsing(fn ($state, User $record): string => $state ?: $record->name)
                    ->description(fn (User $record): ?string => $record->storeDetails?->shopify_domain ?: $record->name)
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('name')
                    ->label('Domain')
                    ->searchable()
                    ->copyable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('email')
                    ->label('Email')
                    ->state(fn (User $record): ?string => $record->storeDetails?->email ?: $record->email)
                    ->searchable()
                    ->copyable(),

                TextColumn::make('storeDetails.phone')
                    ->label('Phone')
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('storeDetails.plan_name')
                    ->label('Shopify plan')
                    ->badge()
                    ->color('gray')
                    ->placeholder('—'),

                IconColumn::make('dev_store')
                    ->label('Dev')
                    ->boolean()
                    ->state(fn (User $record): bool => $record->isDevStore())
                    ->tooltip('Dev stores get TEST charges; real stores are billed live. Synced from Shopify via "Sync details".'),

                TextColumn::make('plan.name')
                    ->label('App plan')
                    ->badge()
                    ->color('success')
                    ->placeholder('Free'),

                TextColumn::make('credits_used')
                    ->label('Used')
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('credits')
                    ->label('Limit')
                    ->state(fn (User $record): string => $record->hasUnlimitedCredits()
                        ? 'Unlimited'
                        : number_format((int) $record->credits))
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                ViewColumn::make('credits_left')
                    ->label('Credits')
                    ->view('filament.columns.store-credits-bar')
                    ->sortable(query: fn (Builder $query, string $direction): Builder => $query->orderByRaw('(credits - credits_used) ' . $direction)),

                TextColumn::make('status')
                    ->label('Status')
                    ->state(fn (User $record): string => $record->deleted_at ? 'Uninstalled' : 'Installed')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'Uninstalled' ? 'danger' : 'success')
                    ->sortable(query: fn (Builder $query, string $direction): Builder => $query->orderBy('deleted_at', $direction)),

                IconColumn::make('storeDetails.shopify_plus')
                    ->label('Plus')
                    ->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('storeDetails.country')
                    ->label('Country')
                    ->placeholder('—')
                    ->toggleable(),

                TextColumn::make('job_logs_count')
                    ->label('Jobs')
                    ->badge()
                    ->color('info')
                    ->alignCenter()
                    ->sortable(),

                TextColumn::make('products_count')
                    ->label('Products')
                    ->badge()
                    ->color('gray')
                    ->alignCenter()
                    ->sortable(),

                TextColumn::make('created_at')
                    ->label('Installed')
                    ->dateTime('M j, Y')
                    ->sortable(),

                TextColumn::make('storeDetails.updated_at')
                    ->label('Last sync')
                    ->since()
                    ->placeholder('Never')
                    ->toggleable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Filter::make('status')
                    ->form([
                        Select::make('status')
                            ->label('Installation status')
                            ->options([
                                'installed' => 'Installed',
                                'uninstalled' => 'Uninstalled',
                            ])
                            ->placeholder('All'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return match ($data['status'] ?? null) {
                            'installed' => $query->whereNull('deleted_at'),
                            'uninstalled' => $query->whereNotNull('deleted_at'),
                            default => $query,
                        };
                    }),

                SelectFilter::make('plan_id')
                    ->label('App plan')
                    ->relationship('plan', 'name')
                    ->placeholder('All plans'),
            ])
            ->recordActions([
                ViewAction::make()
                    ->slideOver(),

                Action::make('sync')
                    ->label('Sync details')
                    ->icon('heroicon-o-arrow-path')
                    ->color('gray')
                    ->visible(fn (User $record): bool => ! $record->deleted_at)
                    ->action(function (User $record): void {
                        $synced = app(StoreDetailService::class)->sync($record);

                        if ($synced) {
                            Notification::make()
                                ->title('Store details synced from Shopify')
                                ->success()
                                ->send();
                        } else {
                            Notification::make()
                                ->title('Sync failed')
                                ->body('Could not reach Shopify for this store. Check the logs.')
                                ->danger()
                                ->send();
                        }
                    }),

                Action::make('changePlan')
                    ->label('Change plan')
                    ->icon('heroicon-o-arrows-right-left')
                    ->color('primary')
                    ->fillForm(fn (User $record): array => ['plan_id' => $record->plan_id])
                    ->form([
                        Select::make('plan_id')
                            ->label('App plan')
                            ->options(fn (): array => \App\Models\Plan::orderBy('name')->pluck('name', 'id')->all())
                            ->placeholder('Free (no plan)')
                            ->searchable(),

                        Toggle::make('reset_credits')
                            ->label('Reset credit allowance to the new plan')
                            ->helperText('Sets the credit limit from the plan and resets usage to 0.')
                            ->default(true),

                        Toggle::make('cancel_shopify_charge')
                            ->label('Cancel the active Shopify recurring charge')
                            ->helperText('Attempts to cancel the live Shopify subscription for this store.')
                            ->default(false),
                    ])
                    ->action(function (array $data, User $record): void {
                        $previousPlan = $record->plan_id ? \App\Models\Plan::find($record->plan_id) : null;
                        $newPlan = $data['plan_id'] ? \App\Models\Plan::find($data['plan_id']) : null;

                        $record->plan_id = $newPlan?->id;
                        // Keep the freemium flag in sync: a paid plan means
                        // not freemium; no plan drops back to the free tier.
                        $record->shopify_freemium = $newPlan ? 0 : 1;

                        // Always restart the refill schedule on a plan change
                        // (credits_reset_at = NEXT refill): a stale past
                        // timestamp would let the hourly reset command refill
                        // the store within the hour, overriding the balance
                        // chosen here. The Free plan refills monthly too.
                        $record->credits_reset_at = now()->addDays(30);

                        if (! empty($data['reset_credits'])) {
                            $record->credits = $newPlan?->unlimited_credits
                                ? 999999
                                : (int) ($newPlan->monthly_credits ?? 0);
                            $record->credits_used = 0;
                        }

                        $record->save();

                        \App\Models\PlanChangeLog::record(
                            $record,
                            $previousPlan,
                            $newPlan,
                            \App\Models\PlanChangeLog::SOURCE_ADMIN,
                            notes: 'Plan changed from the admin panel'
                        );

                        if (! empty($data['cancel_shopify_charge']) && ! $record->deleted_at) {
                            static::cancelShopifyCharges($record);
                        }

                        Notification::make()
                            ->title('Plan updated')
                            ->success()
                            ->send();
                    }),

                Action::make('credits')
                    ->label('Credits')
                    ->icon('heroicon-o-banknotes')
                    ->color('warning')
                    ->fillForm(fn (User $record): array => [
                        'credits' => $record->credits,
                        'credits_used' => $record->credits_used,
                    ])
                    ->form([
                        TextInput::make('credits')
                            ->label('Credit limit (allowance)')
                            ->numeric()
                            ->minValue(0)
                            ->required(),

                        TextInput::make('credits_used')
                            ->label('Credits used')
                            ->numeric()
                            ->minValue(0)
                            ->required(),
                    ])
                    ->action(function (array $data, User $record): void {
                        $record->update([
                            'credits' => (int) $data['credits'],
                            'credits_used' => (int) $data['credits_used'],
                        ]);

                        Notification::make()
                            ->title('Credits updated')
                            ->success()
                            ->send();
                    }),

                Action::make('resetUsage')
                    ->label('Reset usage')
                    ->icon('heroicon-o-arrow-uturn-left')
                    ->color('gray')
                    ->requiresConfirmation()
                    ->modalDescription('Set this store\'s credits used back to 0?')
                    ->action(function (User $record): void {
                        $record->update(['credits_used' => 0]);

                        Notification::make()
                            ->title('Usage reset to 0')
                            ->success()
                            ->send();
                    }),

                Action::make('uninstall')
                    ->label('Uninstall')
                    ->icon('heroicon-o-trash')
                    ->color('danger')
                    ->visible(fn (User $record): bool => ! $record->deleted_at)
                    ->requiresConfirmation()
                    ->modalHeading('Uninstall shop')
                    ->modalDescription('This force-uninstalls the app from Shopify and deletes the store\'s synced data. This cannot be undone.')
                    ->action(function (User $record): void {
                        try {
                            $mutation = 'mutation { appUninstall { userErrors { field message } } }';
                            $response = $record->api()->graph($mutation);

                            $errors = data_get(
                                $response,
                                'body.container.data.appUninstall.userErrors',
                                data_get($response, 'body.data.appUninstall.userErrors', [])
                            );

                            if (! empty($errors)) {
                                throw new \Exception($errors[0]['message'] ?? 'An error occurred during uninstallation.');
                            }

                            dispatch(new \App\Jobs\AppUninstalledJob($record->name, json_decode('{}')));

                            Notification::make()
                                ->title('Shop uninstalled from Shopify')
                                ->success()
                                ->send();
                        } catch (\Throwable $e) {
                            Notification::make()
                                ->title('Uninstall failed')
                                ->body($e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),
            ])
            ->recordClasses(fn (User $record): ?string => $record->deleted_at ? 'opacity-60' : null);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Store')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('storeDetails.shop_name')
                            ->label('Shop name')
                            ->state(fn (User $record): ?string => $record->storeDetails?->shop_name ?: $record->name),
                        TextEntry::make('name')->label('Domain')->copyable(),
                        TextEntry::make('email')
                            ->label('Email')
                            ->state(fn (User $record): ?string => $record->storeDetails?->email ?: $record->email)
                            ->copyable(),
                        TextEntry::make('storeDetails.phone')->label('Phone')->placeholder('—'),
                        TextEntry::make('storeDetails.country')->label('Country')->placeholder('—'),
                        TextEntry::make('storeDetails.currency')->label('Currency')->placeholder('—'),
                        IconEntry::make('storeDetails.shopify_plus')->label('Shopify Plus')->boolean(),
                        TextEntry::make('status')
                            ->label('Status')
                            ->state(fn (User $record): string => $record->deleted_at ? 'Uninstalled' : 'Installed')
                            ->badge()
                            ->color(fn (string $state): string => $state === 'Uninstalled' ? 'danger' : 'success'),
                        TextEntry::make('created_at')->label('Installed')->dateTime(),
                        TextEntry::make('storeDetails.updated_at')->label('Last sync')->since()->placeholder('Never'),
                    ]),

                Section::make('Plan & usage')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('plan.name')->label('App plan')->badge()->color('success')->placeholder('Free'),
                        TextEntry::make('storeDetails.plan_name')->label('Shopify plan')->badge()->color('gray')->placeholder('—'),
                        IconEntry::make('dev_store')
                            ->label('Dev store (test charges)')
                            ->state(fn (User $record): bool => $record->isDevStore())
                            ->boolean(),
                        TextEntry::make('job_logs_count')->label('Bulk jobs run')->state(fn (User $record): int => $record->jobLogs()->count()),
                        TextEntry::make('products_count')->label('Products synced')->state(fn (User $record): int => $record->products()->count()),
                    ]),

                Section::make('Credits')
                    ->columns(3)
                    ->schema([
                        IconEntry::make('unlimited')
                            ->label('Unlimited')
                            ->state(fn (User $record): bool => $record->hasUnlimitedCredits())
                            ->boolean(),
                        TextEntry::make('credits')->label('Limit')->numeric(),
                        TextEntry::make('credits_used')->label('Used')->numeric(),
                        TextEntry::make('credits_remaining')
                            ->label('Remaining')
                            ->state(fn (User $record): string => $record->hasUnlimitedCredits()
                                ? '∞'
                                : number_format(max(0, (int) $record->credits - (int) $record->credits_used)))
                            ->color('success'),
                        TextEntry::make('credits_reset_at')->label('Next refill')->dateTime()->placeholder('—'),
                    ]),
            ]);
    }

    /**
     * Attempt to cancel any active Shopify recurring charges for a shop.
     */
    protected static function cancelShopifyCharges(User $record): void
    {
        try {
            $charges = $record->charges()
                ->whereIn('status', ['ACTIVE', 'ACCEPTED', 'active', 'accepted'])
                ->whereNull('cancelled_on')
                ->get();

            foreach ($charges as $charge) {
                $gid = 'gid://shopify/AppSubscription/' . $charge->charge_id;
                $record->api()->graph(
                    'mutation cancel($id: ID!) { appSubscriptionCancel(id: $id) { userErrors { message } } }',
                    ['id' => $gid]
                );
                $charge->update(['status' => 'CANCELLED', 'cancelled_on' => now()]);
                $charge->delete();
            }
        } catch (\Throwable $e) {
            Notification::make()
                ->title('Plan changed, but Shopify charge cancellation failed')
                ->body($e->getMessage())
                ->warning()
                ->send();
        }
    }

    public static function getPages(): array
    {
        return [
            'index' => ListStores::route('/'),
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
