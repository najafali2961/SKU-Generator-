<?php

namespace App\Filament\Resources\SupportEmails;

use App\Filament\Resources\SupportEmails\Pages\CreateSupportEmail;
use App\Filament\Resources\SupportEmails\Pages\EditSupportEmail;
use App\Filament\Resources\SupportEmails\Pages\ListSupportEmails;
use App\Filament\Resources\SupportEmails\Schemas\SupportEmailForm;
use App\Filament\Resources\SupportEmails\Tables\SupportEmailsTable;
use App\Models\SupportEmail;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class SupportEmailResource extends Resource
{
    protected static ?string $model = SupportEmail::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return SupportEmailForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return SupportEmailsTable::configure($table);
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
            'index' => ListSupportEmails::route('/'),
            'view' => \App\Filament\Resources\SupportEmails\Pages\ViewSupportEmail::route('/{record}'),
        ];
    }
}
