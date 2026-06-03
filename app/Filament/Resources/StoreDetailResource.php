<?php

namespace App\Filament\Resources;

use App\Filament\Resources\StoreDetailResource\Pages;
use App\Models\StoreDetail;
use BackedEnum;
use Filament\Forms;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ViewColumn;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Filters\Filter;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class StoreDetailResource extends Resource
{
    protected static ?string $model = StoreDetail::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-building-storefront';
    
    protected static string | UnitEnum | null $navigationGroup = 'Store Management';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('shop_name'),
                TextInput::make('shop_id'),
                TextInput::make('email'),
                TextInput::make('plan_name'),
                Toggle::make('shopify_plus'),
                TextInput::make('country'),
                TextInput::make('currency'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('user'))
            ->columns([
                TextColumn::make('shop_name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('shopify_domain')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('primary_domain')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('shop_id')
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('currency')
                    ->searchable()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('email')
                    ->state(function (StoreDetail $record): ?string {
                        return $record->email ?: $record->user?->email;
                    })
                    ->searchable()
                    ->copyable(),
                TextColumn::make('phone')
                    ->searchable(),
                TextColumn::make('plan_name')
                    ->badge()
                    ->searchable()
                    ->color(fn (?string $state): string => match ($state) {
                        'frozen' => 'gray',
                        'cancelled' => 'danger',
                        default => 'success',
                    }),
                ViewColumn::make('credits')
                    ->label('Credits')
                    ->view('filament.columns.credits-bar')
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        // Sort by remaining credits (allocated - used).
                        return $query->orderBy(
                            \App\Models\User::selectRaw('credits - credits_used')
                                ->whereColumn('users.id', 'store_details.user_id')
                                ->limit(1),
                            $direction
                        );
                    }),
                TextColumn::make('status')
                    ->label('Status')
                    ->state(function (StoreDetail $record): string {
                        return (!$record->user || $record->user->deleted_at) ? 'Uninstalled' : 'Installed';
                    })
                    ->badge()
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy(
                            \App\Models\User::select('deleted_at')
                                ->whereColumn('users.id', 'store_details.user_id')
                                ->limit(1), 
                            $direction
                        );
                    })
                    ->color(fn (string $state): string => $state === 'Uninstalled' ? 'danger' : 'success'),
                IconColumn::make('shopify_plus')
                    ->searchable()
                     ->sortable()
                    ->boolean()
                    ->label('Plus'),
                TextColumn::make('country')
                 ->sortable()
                    ->searchable(),
                TextColumn::make('user.name')
                    ->label('User')
                    ->state(function (StoreDetail $record): ?string {
                        return $record->user?->name ?: $record->shopify_domain;
                    })
                    ->default('Unknown')
                    ->searchable()
                    ->sortable(query: function (Builder $query, string $direction): Builder {
                        return $query->orderBy(
                            \App\Models\User::select('name')
                                ->whereColumn('users.id', 'store_details.user_id')
                                ->limit(1),
                            $direction
                        );
                    })
                    ->url(fn (StoreDetail $record) => $record->user_id ? \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id]) : null),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('plan_name')
                    ->label('Plan')
                    ->options([
                        'Basic App Development' => 'Basic App Development',
                        'Developer Preview' => 'Developer Preview',
                        'Development' => 'Development',
                        'Basic' => 'Basic',
                        'Shopify' => 'Shopify',
                        'Advanced' => 'Advanced',
                        'Plus' => 'Plus',
                    ]),
                TernaryFilter::make('shopify_plus')
                    ->label('Shopify Plus'),
                Filter::make('status')
                    ->form([
                        Forms\Components\Select::make('status')
                            ->options([
                                'installed' => 'Installed',
                                'uninstalled' => 'Uninstalled',
                            ])
                            ->placeholder('All Statuses'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query->where(function ($q) use ($data) {
                            if ($data['status'] === 'installed') {
                                $q->whereHas('user', fn (Builder $q) => $q->whereNull('deleted_at'))
                                  ->orWhereDoesntHave('user');
                            } elseif ($data['status'] === 'uninstalled') {
                                $q->whereHas('user', fn (Builder $q) => $q->withTrashed()->whereNotNull('deleted_at'));
                            }
                        });
                    }),
            ])
            ->actions([
                // View Action is implied if we don't have Pages\Edit
            ])
            ->bulkActions([
                //
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStoreDetails::route('/'),
        ];
    }
    
    public static function canCreate(): bool
    {
        return false;
    }
}
