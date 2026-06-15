<?php

namespace App\Filament\Resources\Features;

use App\Filament\Resources\Features\Pages;
use App\Filament\Resources\Features\Schemas\FeatureForm;
use App\Filament\Resources\Features\Tables\FeaturesTable;
use App\Models\Feature;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class FeatureResource extends Resource
{
    protected static ?string $model = Feature::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-star';

    protected static string | \UnitEnum | null $navigationGroup = 'Billing';

    protected static ?int $navigationSort = 4;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return FeatureForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return FeaturesTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListFeatures::route('/'),
            'create' => Pages\CreateFeature::route('/create'),
            'edit'   => Pages\EditFeature::route('/{record}/edit'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'slug', 'description'];
    }

    public static function getGlobalSearchResultTitle(Model $record): string
    {
        return $record->name;
    }
}
