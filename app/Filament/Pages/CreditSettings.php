<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use UnitEnum;

class CreditSettings extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-adjustments-horizontal';

    protected static string|UnitEnum|null $navigationGroup = 'Billing';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Credit Settings';

    protected static ?string $title = 'Credit Settings';

    /** @var array<string, mixed> */
    public ?array $data = [];

    /**
     * Settings keys persisted to the settings table, with their defaults.
     * credit_cost_* keys are read by HasCredits::getCreditCosts() and drive
     * how many credits each action consumes.
     *
     * @var array<string, mixed>
     */
    protected const DEFAULTS = [
        'credit_cost_sku_generation' => 1,
        'credit_cost_barcode_generation' => 1,
        'credit_cost_barcode_import' => 1,
        'credit_cost_label_printing' => 2,
        'credit_cost_template_save' => 0,
        'notify_on_limit' => true,
        'limit_reached_message' => 'You have used all of your credits for this billing period. Upgrade your plan to keep editing.',
        'support_email' => '',
        'giveaway_credits' => 100,
        'support_giveaway_key' => '',
    ];

    public function mount(): void
    {
        $state = [];

        foreach (static::DEFAULTS as $key => $default) {
            $value = Setting::getValue($key, $default);

            $state[$key] = match (true) {
                $key === 'notify_on_limit' => (bool) $value,
                str_starts_with($key, 'credit_cost_'), $key === 'giveaway_credits' => (int) $value,
                default => $value,
            };
        }

        $this->form->fill($state);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Credit cost per action')
                    ->description('How many credits each action consumes. Applies to both the merchant app and the deduction logic. Set to 0 to make an action free.')
                    ->columns(2)
                    ->schema([
                        TextInput::make('credit_cost_sku_generation')
                            ->label('SKU generation (per SKU)')
                            ->numeric()->minValue(0)->required(),

                        TextInput::make('credit_cost_barcode_generation')
                            ->label('Barcode generation (per barcode)')
                            ->numeric()->minValue(0)->required(),

                        TextInput::make('credit_cost_barcode_import')
                            ->label('Barcode / CSV import (per item)')
                            ->numeric()->minValue(0)->required()
                            ->helperText('Used for CSV barcode imports too.'),

                        TextInput::make('credit_cost_label_printing')
                            ->label('Label printing (per label)')
                            ->numeric()->minValue(0)->required(),

                        TextInput::make('credit_cost_template_save')
                            ->label('Template save (per save)')
                            ->numeric()->minValue(0)->required()
                            ->helperText('Usually 0 (free).'),
                    ]),

                Section::make('Limit notifications')
                    ->description('What happens when a merchant runs out of credits.')
                    ->schema([
                        Toggle::make('notify_on_limit')
                            ->label('Email merchants when they hit their credit limit'),

                        Textarea::make('limit_reached_message')
                            ->label('Limit-reached message')
                            ->rows(3)
                            ->columnSpanFull(),

                        TextInput::make('support_email')
                            ->label('Support email')
                            ->email(),
                    ]),

                Section::make('Support giveaways')
                    ->description('Free credits granted through a support giveaway link.')
                    ->schema([
                        TextInput::make('giveaway_credits')
                            ->label('Free credits per giveaway')
                            ->numeric()
                            ->minValue(0),

                        TextInput::make('support_giveaway_key')
                            ->label('Support grant key (optional)')
                            ->helperText('Leave empty and the /support/giveaway/{domain}/{credits} link works with a plain URL, as always. Set a key to require ?key=... on that link.')
                            ->maxLength(64),
                    ]),
            ])
            ->statePath('data');
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                Form::make([EmbeddedSchema::make('form')])
                    ->id('form')
                    ->livewireSubmitHandler('save')
                    ->footer([
                        Actions::make([
                            Action::make('save')
                                ->label('Save changes')
                                ->submit('save')
                                ->keyBindings(['mod+s']),
                        ]),
                    ]),
            ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();

        foreach ($data as $key => $value) {
            if (! array_key_exists($key, static::DEFAULTS)) {
                continue;
            }

            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value],
            );
        }

        Notification::make()
            ->title('Credit settings saved')
            ->success()
            ->send();
    }
}
