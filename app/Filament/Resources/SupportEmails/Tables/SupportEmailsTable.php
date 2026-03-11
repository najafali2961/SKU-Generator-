<?php

namespace App\Filament\Resources\SupportEmails\Tables;

use Filament\Actions\Action;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\ViewAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class SupportEmailsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('from_name')
                    ->label('Name')
                    ->searchable()
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),

                TextColumn::make('from_email')
                    ->label('Email')
                    ->searchable()
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),

                TextColumn::make('subject')
                    ->searchable()
                    ->limit(40)
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),

                TextColumn::make('body_text')
                    ->label('Message Snippet')
                    ->searchable()
                    ->limit(50)
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),

                TextColumn::make('date')
                    ->dateTime()
                    ->sortable()
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),
            ])
            ->defaultSort('date', 'desc')
            ->filters([
                // Add filters here if needed
            ])
            ->actions([
                Action::make('viewMessage')
                    ->label('View')
                    ->icon('heroicon-o-eye')
                    ->modalHeading('Support Email')
                    ->modalWidth('5xl')
                    ->modalSubmitAction(false)
                    ->modalCancelActionLabel('Close')
                    ->modalContent(fn (\App\Models\SupportEmail $record) => view('filament.pages.email-message', ['html' => $record->body_html, 'text' => $record->body_text]))
                    ->action(function (\App\Models\SupportEmail $record) {
                        if (!$record->is_read) {
                            $record->update(['is_read' => true]);
                        }
                    }),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    BulkAction::make('markAsRead')
                        ->label('Mark as Read')
                        ->icon('heroicon-o-check-circle')
                        ->action(fn (\Illuminate\Database\Eloquent\Collection $records) => $records->each->update(['is_read' => true]))
                        ->deselectRecordsAfterCompletion(),
                    
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}