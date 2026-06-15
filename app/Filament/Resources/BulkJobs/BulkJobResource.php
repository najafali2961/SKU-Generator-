<?php

namespace App\Filament\Resources\BulkJobs;

use App\Filament\Resources\BulkJobs\Pages\ListBulkJobs;
use App\Models\JobLog;
use App\Models\User;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class BulkJobResource extends Resource
{
    protected static ?string $model = JobLog::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-queue-list';

    protected static string|UnitEnum|null $navigationGroup = 'Store Management';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'Bulk Jobs';

    protected static ?string $modelLabel = 'Bulk Job';

    /** Active (in-flight) statuses. */
    protected const ACTIVE = ['pending', 'running'];

    protected static function typeColor(?string $type): string
    {
        return match ($type) {
            'sku_generation' => 'info',
            'barcode_generation' => 'success',
            'barcode_import' => 'warning',
            'label_printing' => 'primary',
            default => 'gray',
        };
    }

    protected static function statusColor(?string $status): string
    {
        return match ($status) {
            'completed' => 'success',
            'running' => 'warning',
            'failed' => 'danger',
            default => 'gray',
        };
    }

    protected static function statusIcon(?string $status): string
    {
        return match ($status) {
            'completed' => 'heroicon-o-check-circle',
            'running' => 'heroicon-o-arrow-path',
            'failed' => 'heroicon-o-x-circle',
            default => 'heroicon-o-clock',
        };
    }

    protected static function duration(JobLog $record): string
    {
        if (! $record->started_at) {
            return '—';
        }

        $end = $record->finished_at ?? now();
        $human = $record->started_at->diffForHumans($end, ['parts' => 2, 'short' => true, 'syntax' => true]);

        return $record->finished_at ? $human : $human . ' (running)';
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('user.storeDetails');
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::whereIn('status', static::ACTIVE)->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function table(Table $table): Table
    {
        return $table
            ->poll('30s')
            ->columns([
                TextColumn::make('user.name')
                    ->label('Store')
                    ->state(fn (JobLog $record): ?string => $record->user?->storeDetails?->shop_name ?: $record->user?->name)
                    ->description(fn (JobLog $record): ?string => $record->user?->storeDetails?->shopify_domain)
                    ->searchable()
                    ->weight(\Filament\Support\Enums\FontWeight::Bold),

                TextColumn::make('title')
                    ->label('Task')
                    ->searchable()
                    ->limit(40),

                TextColumn::make('type')
                    ->badge()
                    ->color(fn (?string $state): string => static::typeColor($state))
                    ->formatStateUsing(fn (?string $state): string => $state ? ucwords(str_replace('_', ' ', $state)) : '—'),

                TextColumn::make('status')
                    ->badge()
                    ->color(fn (?string $state): string => static::statusColor($state))
                    ->icon(fn (?string $state): string => static::statusIcon($state)),

                TextColumn::make('progress')
                    ->label('Progress')
                    ->state(fn (JobLog $record): string => sprintf(
                        '%s / %s (%d%%)',
                        number_format((int) $record->processed_items),
                        number_format((int) $record->total_items),
                        (int) $record->progress_percentage
                    )),

                TextColumn::make('processed_items')
                    ->label('OK')
                    ->numeric()
                    ->color('success')
                    ->alignCenter(),

                TextColumn::make('failed_items')
                    ->label('Failed')
                    ->numeric()
                    ->color(fn ($state): string => (int) $state > 0 ? 'danger' : 'gray')
                    ->alignCenter(),

                TextColumn::make('started_at')
                    ->label('Started')
                    ->dateTime('M j, H:i')
                    ->placeholder('—')
                    ->sortable(),

                TextColumn::make('duration')
                    ->label('Duration')
                    ->state(fn (JobLog $record): string => static::duration($record)),

                TextColumn::make('created_at')
                    ->label('Created')
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'running' => 'Running',
                        'completed' => 'Completed',
                        'failed' => 'Failed',
                    ]),

                SelectFilter::make('type')
                    ->options([
                        'sku_generation' => 'SKU generation',
                        'barcode_generation' => 'Barcode generation',
                        'barcode_import' => 'Barcode import',
                        'label_printing' => 'Label printing',
                    ]),

                SelectFilter::make('user')
                    ->label('Store')
                    ->relationship('user', 'name')
                    ->searchable()
                    ->preload(),
            ])
            ->recordActions([
                ViewAction::make()->slideOver(),
            ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Job')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('title')->label('Task'),
                        TextEntry::make('type')
                            ->badge()
                            ->color(fn (?string $state): string => static::typeColor($state))
                            ->formatStateUsing(fn (?string $state): string => $state ? ucwords(str_replace('_', ' ', $state)) : '—'),
                        TextEntry::make('status')
                            ->badge()
                            ->color(fn (?string $state): string => static::statusColor($state)),
                        TextEntry::make('description')->placeholder('—')->columnSpanFull(),
                    ]),

                Section::make('Store')
                    ->columns(2)
                    ->schema([
                        TextEntry::make('user.storeDetails.shop_name')
                            ->label('Shop')
                            ->state(fn (JobLog $record): ?string => $record->user?->storeDetails?->shop_name ?: $record->user?->name),
                        TextEntry::make('user.name')->label('Domain'),
                    ]),

                Section::make('Results')
                    ->columns(4)
                    ->schema([
                        TextEntry::make('total_items')->label('Total')->numeric(),
                        TextEntry::make('processed_items')->label('Processed')->numeric()->color('success'),
                        TextEntry::make('failed_items')->label('Failed')->numeric()->color('danger'),
                        TextEntry::make('progress_percentage')->label('Progress')->suffix('%'),
                        TextEntry::make('error_message')->label('Error')->placeholder('—')->color('danger')->columnSpanFull(),
                    ]),

                Section::make('Timing')
                    ->columns(3)
                    ->schema([
                        TextEntry::make('started_at')->dateTime()->placeholder('—'),
                        TextEntry::make('finished_at')->dateTime()->placeholder('—'),
                        TextEntry::make('duration')
                            ->state(fn (JobLog $record): string => static::duration($record)),
                    ]),

                Section::make('Job parameters')
                    ->collapsed()
                    ->schema([
                        TextEntry::make('payload')
                            ->hiddenLabel()
                            ->state(fn (JobLog $record): string => mb_substr(
                                json_encode($record->payload ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '',
                                0,
                                3000
                            ))
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListBulkJobs::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
