<?php

namespace App\Filament\Resources\Feedback;

use App\Filament\Resources\Feedback\Pages\CreateFeedback;
use App\Filament\Resources\Feedback\Pages\EditFeedback;
use App\Filament\Resources\Feedback\Pages\ListFeedback;
use App\Filament\Resources\Feedback\Schemas\FeedbackForm;
use App\Filament\Resources\Feedback\Tables\FeedbackTable;
use App\Models\Feedback;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class FeedbackResource extends Resource
{
    protected static ?string $model = Feedback::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chat-bubble-left-ellipsis';
    
    protected static string|\UnitEnum|null $navigationGroup = 'System';

    protected static ?int $navigationSort = 2;

    public static function form(Schema $schema): Schema
    {
        return FeedbackForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return FeedbackTable::configure($table);
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
            'index' => ListFeedback::route('/'),
            'create' => CreateFeedback::route('/create'),
            // 'edit' => EditFeedback::route('/{record}/edit'),
        ];
    }
}
