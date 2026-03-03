<?php

namespace App\Filament\Resources\RestrictedKeywords;

use App\Filament\Resources\RestrictedKeywords\Pages\CreateRestrictedKeyword;
use App\Filament\Resources\RestrictedKeywords\Pages\EditRestrictedKeyword;
use App\Filament\Resources\RestrictedKeywords\Pages\ListRestrictedKeywords;
use App\Filament\Resources\RestrictedKeywords\Schemas\RestrictedKeywordForm;
use App\Filament\Resources\RestrictedKeywords\Tables\RestrictedKeywordsTable;
use App\Models\RestrictedKeyword;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class RestrictedKeywordResource extends Resource
{
    protected static ?string $model = RestrictedKeyword::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;
    protected static string|\UnitEnum|null $navigationGroup = 'Store Management';

    public static function form(Schema $schema): Schema
    {
        return RestrictedKeywordForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return RestrictedKeywordsTable::configure($table);
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
            'index' => ListRestrictedKeywords::route('/'),
            'create' => CreateRestrictedKeyword::route('/create'),
            'edit' => EditRestrictedKeyword::route('/{record}/edit'),
        ];
    }
}
