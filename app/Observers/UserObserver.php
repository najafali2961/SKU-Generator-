<?php

namespace App\Observers;

use App\Models\User;

class UserObserver
{
    public function created(User $user)
    {
        // Only give 50 credits on first creation (new install)
        if ($user->credits === null || $user->credits == 0) {
            $user->credits = 50;
            $user->credits_used = 0;
            $user->credits_reset_at = now()->addMonth(); // or your preferred reset time
            $user->saveQuietly(); // avoids triggering events again
        }

        // OR simply:
        // $user->increment('credits', 50);
    }
}