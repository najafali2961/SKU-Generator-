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
     *
     * @var array<string, mixed>
     */
    protected const DEFAULTS = [
        'credits_per_edit' => 1,
        'notify_on_limit' => true,
        'limit_reached_message' => 'You have used all of your credits for this billing period. Upgrade your plan to keep editing.',
        'support_email' => '',
        'giveaway_credits' => 100,
    ];

    public function mount(): void
    {
        $state = [];

        foreach (static::DEFAULTS as $key => $default) {
            $value = Setting::getValue($key, $default);

            $state[$key] = match ($key) {
                'notify_on_limit' => (bool) $value,
                'credits_per_edit', 'giveaway_credits' => (int) $value,
                default => $value,
            };
        }

        $this->form->fill($state);
    }

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Credit metering')
                    ->description('How credits are consumed and how merchants are warned near the limit.')
                    ->schema([
                        TextInput::make('credits_per_edit')
                            ->label('Credits per product edit')
                            ->numeric()
                            ->minValue(0)
                            ->default(1)
                            ->required(),

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
                            ->minValue(0)
                            ->default(100),
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
