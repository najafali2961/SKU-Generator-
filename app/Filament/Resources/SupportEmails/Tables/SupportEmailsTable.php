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
                    ->label('From')
                    ->description(fn (\App\Models\SupportEmail $record): string => $record->from_email)
                    ->searchable(['from_name', 'from_email'])
                    ->weight(fn (\App\Models\SupportEmail $record) => $record->is_read ? 'regular' : 'bold'),

                TextColumn::make('subject')
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
            ->actions([  // ← This is now used for record/row actions (was recordActions in v3)
                Action::make('markAsRead')
                    ->label('Mark Read')
                    ->icon('heroicon-o-check-circle')
                    ->hidden(fn (\App\Models\SupportEmail $record) => $record->is_read)
                    ->action(fn (\App\Models\SupportEmail $record) => $record->update(['is_read' => true])),

                ViewAction::make()
                    ->mutateRecordDataUsing(function (array $data, \App\Models\SupportEmail $record): array {
                        if (!$record->is_read) {
                            $record->update(['is_read' => true]);
                        }
                        return $data;
                    }),

                DeleteAction::make(),
            ])
            ->bulkActions([  // ← Groups bulk actions (was toolbarActions in some v3 patterns)
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