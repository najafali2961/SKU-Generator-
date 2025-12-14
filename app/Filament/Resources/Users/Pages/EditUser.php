<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\EditRecord;
use Filament\Notifications\Notification;
use Osiset\ShopifyApp\Storage\Models\Plan;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
            ForceDeleteAction::make(),
            RestoreAction::make(),
        ];
    }

    protected function afterSave(): void
    {
        $user = $this->record;
        $originalPlanId = $this->record->getOriginal('plan_id');
        $newPlanId = $user->plan_id;

        // If plan changed and it's not null
        if ($originalPlanId !== $newPlanId && $newPlanId !== null) {
            $plan = Plan::find($newPlanId);

            if ($plan) {
                try {
                    // Create recurring charge via Shopify API
                    $response = $user->api()->rest('POST', '/admin/api/2024-10/recurring_application_charges.json', [
                        'recurring_application_charge' => [
                            'name' => $plan->name,
                            'price' => $plan->price,
                            'return_url' => route('billing.process'),
                            'trial_days' => $plan->trial_days ?? 0,
                            'test' => $plan->test ?? false,
                        ]
                    ]);

                    if (isset($response['body']['recurring_application_charge']['confirmation_url'])) {
                        $confirmationUrl = $response['body']['recurring_application_charge']['confirmation_url'];

                        Notification::make()
                            ->title('Plan Change Initiated')
                            ->body("User needs to approve the new plan. Send them to: {$confirmationUrl}")
                            ->success()
                            ->send();
                    }
                } catch (\Exception $e) {
                    Notification::make()
                        ->title('Plan Change Failed')
                        ->body($e->getMessage())
                        ->danger()
                        ->send();
                }
            }
        }

        // If plan set to null (downgrade to free)
        if ($newPlanId === null && $originalPlanId !== null) {
            $user->update(['shopify_freemium' => true]);

            Notification::make()
                ->title('Plan Downgraded')
                ->body('User has been moved to the free plan.')
                ->success()
                ->send();
        }
    }
}
