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
                    ->state(function (Feedback $record): ?string {
                        return $record->user?->name ?: $record->user?->storeDetails?->shopify_domain ?: 'Unknown';
                    })
                    ->searchable()
                    ->sortable(query: function (\Illuminate\Database\Eloquent\Builder $query, string $direction): \Illuminate\Database\Eloquent\Builder {
                        return $query->orderBy(
                            \App\Models\User::withTrashed()->select('name')
                                ->whereColumn('users.id', 'feedback.user_id')
                                ->limit(1),
                            $direction
                        );
                    })
                    ->url(fn (Feedback $record) => $record->user_id ? \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id]) : null),
                    
                TextColumn::make('user.email')
                    ->label('Email')
                    ->state(function (Feedback $record): ?string {
                        return $record->user?->email ?: $record->user?->storeDetails?->email ?: 'Unknown';
                    })
                    ->searchable()
                    ->sortable(query: function (\Illuminate\Database\Eloquent\Builder $query, string $direction): \Illuminate\Database\Eloquent\Builder {
                        return $query->orderBy(
                            \App\Models\User::withTrashed()->select('email')
                                ->whereColumn('users.id', 'feedback.user_id')
                                ->limit(1),
                            $direction
                        );
                    })
                    ->url(fn (Feedback $record) => $record->user_id ? \App\Filament\Resources\Users\UserResource::getUrl('edit', ['record' => $record->user_id]) : null),
                    
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
