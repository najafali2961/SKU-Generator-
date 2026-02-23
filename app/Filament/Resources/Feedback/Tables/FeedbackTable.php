<?php

namespace App\Filament\Resources\Feedback\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Table;

use Filament\Tables\Columns\TextColumn;
use App\Models\Feedback;
use Filament\Actions\Action;
use Filament\Support\Enums\Width;

class FeedbackTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('user.name')
                    ->label('User')
                    ->searchable()
                    ->sortable()
                    ->url(fn (Feedback $record) => \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id])),
                    
                TextColumn::make('user.email')
                    ->label('Email')
                    ->searchable()
                    ->sortable()
                    ->url(fn (Feedback $record) => \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id])),
                    
                TextColumn::make('rating')
                    ->sortable()
                    ->formatStateUsing(fn ($state) => str_repeat('⭐', $state ?? 0) . str_repeat('☆', 5 - ($state ?? 0))),
                    
                TextColumn::make('message')
                    ->searchable()
                    ->limit(50),
                    
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Action::make('viewMessage')
                    ->label('View Message')
                    ->icon('heroicon-o-chat-bubble-bottom-center-text')
                    ->modalHeading('Feedback Message')
                    ->modalWidth(Width::Medium)
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Close')
                    ->modalContent(fn (Feedback $record) => view('filament.pages.feedback-message', ['message' => $record->message]))
                    ->visible(fn (Feedback $record): bool => filled($record->message)),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
