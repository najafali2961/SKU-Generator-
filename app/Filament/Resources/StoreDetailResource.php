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
use Filament\Tables\Columns\IconColumn;
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
            ->columns([
                TextColumn::make('shop_name')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('shop_id')
                    ->searchable(),
                TextColumn::make('email')
                    ->searchable()
                    ->copyable(),
                TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable()
                    ->url(fn (StoreDetail $record) => \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id])),
                TextColumn::make('phone')
                    ->searchable(),
                TextColumn::make('plan_name')
                    ->badge()
                    ->searchable()
                    ->color(fn (string $state): string => match ($state) {
                        'frozen' => 'gray',
                        'cancelled' => 'danger',
                        default => 'success',
                    }),
                IconColumn::make('shopify_plus')
                    ->searchable()
                    ->boolean()
                    ->label('Plus'),
                TextColumn::make('country')
                  ->searchable()
                    ->searchable(),
                TextColumn::make('currency')
                  ->searchable()
                    ->searchable(),
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
                //
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
