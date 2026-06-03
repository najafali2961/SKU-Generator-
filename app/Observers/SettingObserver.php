<?php

namespace App\Observers;

use App\Jobs\NotifyFreeCreditsUpdatedJob;
use App\Models\Setting;

class SettingObserver
{
    /**
     * When the free plan credit allowance changes, email all merchants.
     */
    public function saved(Setting $setting): void
    {
        if ($setting->key !== 'free_plan_credits') {
            return;
        }

        // Only fire when the value actually changed (or was just created).
        if (!$setting->wasChanged('value') && !$setting->wasRecentlyCreated) {
            return;
        }

        $credits = (int) $setting->value;
        if ($credits <= 0) {
            return;
        }

        NotifyFreeCreditsUpdatedJob::dispatch($credits);
    }
}
