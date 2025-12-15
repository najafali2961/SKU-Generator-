<?php
// ==============================================
// UPDATED PLAN FORM WITH FEATURES
// ==============================================
// app/Filament/Resources/Plans/Schemas/PlanForm.php

namespace App\Filament\Resources\Plans\Schemas;

use App\Models\Feature;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;
use Filament\Schemas\Components\Section;

class PlanForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                // Basic Information Section
                Section::make('Basic Information')
                    ->schema([
                        TextInput::make('name')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('e.g., Starter, Professional, Enterprise'),

                        Textarea::make('description')
                            ->maxLength(1000)
                            ->placeholder('Plan description shown on pricing page')
                            ->helperText('Optional description'),
                    ]),

                // Advanced Settings Section
                Section::make('Advanced Settings')
                    ->schema([
                        Toggle::make('test')
                            ->label('Test Plan')
                            ->helperText('Only visible in test mode'),

                        Toggle::make('on_install')
                            ->label('Charge on Install')
                            ->helperText('One-time charge when app is installed'),
                    ]),
                // Pricing Section
                Section::make('Pricing & Credits')
                    ->schema([
                        Select::make('type')
                            ->options([
                                'RECURRING' => 'Recurring',
                                'onetime'   => 'One-Time',
                            ])
                            ->required()
                            ->native(false),

                        Select::make('interval')
                            ->options([
                                'EVERY_30_DAYS' => 'Monthly (30 Days)',
                                'ANNUAL' => 'Annual (365 Days)',
                            ])
                            ->required()
                            ->native(false)
                            ->default('EVERY_30_DAYS'),

                        TextInput::make('price')
                            ->numeric()
                            ->prefix('$')
                            ->required()
                            ->minValue(0)
                            ->step(0.01)
                            ->helperText('Price per billing period'),

                        TextInput::make('monthly_credits')
                            ->numeric()
                            ->default(0)
                            ->minValue(0)
                            ->helperText('Credits per month. Set to 0 if unlimited'),

                        Toggle::make('unlimited_credits')
                            ->label('Unlimited Credits?')
                            ->helperText('Enable for unlimited credit plans'),

                        TextInput::make('capped_amount')
                            ->numeric()
                            ->prefix('$')
                            ->nullable()
                            ->step(0.01)
                            ->helperText('Maximum charge for overage credits'),

                        TextInput::make('terms')
                            ->maxLength(255)
                            ->nullable()
                            ->placeholder('e.g., "$0.50 per extra label after 1000"')
                            ->helperText('Display terms for extra charges'),

                        TextInput::make('trial_days')
                            ->numeric()
                            ->minValue(0)
                            ->default(0)
                            ->nullable()
                            ->helperText('Number of free trial days (0 = no trial)'),
                    ]),

                // Features Section
                Section::make('Features')
                    ->description('Select which features are included in this plan')
                    ->schema([
                        CheckboxList::make('features')
                            ->relationship('features', 'name')
                            ->options(
                                Feature::where('is_active', true)
                                    ->orderBy('category')
                                    ->orderBy('sort_order')
                                    ->pluck('name', 'id')
                            )
                            ->columns(2)
                            ->searchable()
                            ->bulkToggleable()
                            ->columnSpanFull()
                            ->helperText('Check the features available in this plan'),
                    ]),

            ]);
    }
}
