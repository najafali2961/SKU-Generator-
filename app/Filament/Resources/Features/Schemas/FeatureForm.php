<?php

namespace App\Filament\Resources\Features\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class FeatureForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255)
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn($state, callable $set) => $set('slug', \Str::slug($state)))
                    ->columnSpanFull(),

                TextInput::make('slug')
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true)
                    ->disabled()
                    ->dehydrated()
                    ->columnSpanFull(),

                Textarea::make('description')
                    ->maxLength(1000)
                    ->placeholder('Describe what this feature does')
                    ->columnSpanFull()
                    ->helperText('Optional description for this feature'),

                Select::make('category')
                    ->options([
                        'core' => '🔧 Core Features',
                        'advanced' => '⚡ Advanced Features',
                        'support' => '🎯 Support',
                        'integration' => '🔗 Integrations',
                        'security' => '🔐 Security',
                        'analytics' => '📊 Analytics',
                        'other' => '📌 Other',
                    ])
                    ->native(false)
                    ->searchable()
                    ->placeholder('Select a category'),

                TextInput::make('icon')
                    ->maxLength(255)
                    ->placeholder('heroicon-o-star')
                    ->helperText('Icon name from Heroicons'),

                TextInput::make('sort_order')
                    ->numeric()
                    ->default(0)
                    ->helperText('Lower numbers appear first in lists'),

                Toggle::make('is_active')
                    ->label('Active')
                    ->helperText('Inactive features won\'t appear in plan selection')
                    ->default(true),
            ]);
    }
}
