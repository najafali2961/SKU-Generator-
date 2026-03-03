<?php

namespace App\Filament\Resources\Users\Tables;

use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\SelectColumn;
use Filament\Tables\Table;
use Livewire\Attributes\Title;
use Osiset\ShopifyApp\Storage\Models\Plan;
use Filament\Actions\Action;
class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->searchable()
                    ->sortable()
                    ->label('ID'),

                TextColumn::make('name')
                    ->label('Shop Domain')
                    ->searchable()
                    ->sortable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('email')
                    ->searchable()
                    ->sortable(),

                SelectColumn::make('plan_id')
                    ->label('Plan')
                    ->options(function () {
                        $plans = Plan::pluck('name', 'id')->toArray();
                        return ['' => 'No Plan'] + $plans;
                    })
                    ->placeholder('No Plan')
                    ->sortable(),

                IconColumn::make('shopify_freemium')
                    ->label('Free Plan')
                    ->boolean(),

                TextColumn::make('credits')
                    ->numeric()
                    ->sortable(),

                TextColumn::make('credits_used')
                    ->numeric()
                    ->sortable(),

                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('deleted_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: false)
                    ->color('danger'),
            ])
           ->actions([
    Action::make('uninstall')
        ->label('Uninstall Shop')
        ->icon('heroicon-o-trash')
        ->color('danger')
        ->requiresConfirmation()
        ->modalHeading('Uninstall Shop')
        ->modalDescription('Are you sure you want to run the uninstall job for this shop? This will perform a soft delete and run the uninstall webhook job.')
        ->action(function (\App\Models\User $record) {
            try {
                $mutation = '
                    mutation {
                        appUninstall {
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                ';
                $response = $record->api()->graph($mutation);
                
                $errors = data_get($response, 'body.container.data.appUninstall.userErrors', data_get($response, 'body.data.appUninstall.userErrors', []));
                
                if (!empty($errors)) {
                    throw new \Exception($errors[0]['message'] ?? 'An error occurred during uninstallation.');
                }

                dispatch(new \App\Jobs\AppUninstalledJob($record->name, json_decode('{}')));
                
                \Filament\Notifications\Notification::make()
                    ->title('Shop successfully uninstalled from Shopify')
                    ->success()
                    ->send();
            } catch (\Exception $e) {
                \Filament\Notifications\Notification::make()
                    ->title('Uninstall Failed')
                    ->body($e->getMessage())
                    ->danger()
                    ->send();
            }
        })
])
            ->recordClasses(fn ($record) => $record->deleted_at ? 'bg-danger-50 dark:bg-danger-900/10' : null);
    }
}
