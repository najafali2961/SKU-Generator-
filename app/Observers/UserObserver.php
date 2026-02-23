<?php

namespace App\Observers;

use App\Models\User;

class UserObserver
{
    public function created(User $user)
    {
        // Only give credits on first creation (new install) using the global setting.
        if ($user->credits === null || $user->credits == 0) {
            $defaultCredits = \App\Models\Setting::getValue('free_plan_credits', 500);
            $user->credits = (int) $defaultCredits;
            $user->credits_used = 0;
            $user->credits_reset_at = now()->addMonth(); // or your preferred reset time
            $user->saveQuietly(); // avoids triggering events again
        }

        // OR simply:
        // $user->increment('credits', 50);
    }
}