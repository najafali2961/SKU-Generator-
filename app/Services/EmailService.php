<?php

namespace App\Services;

use App\Mail\AppUninstalledMail;
use App\Mail\CreditsAddedMail;
use App\Mail\CreditsExhaustedMail;
use App\Mail\FreeCreditsUpdatedMail;
use App\Mail\JobCompletedMail;
use App\Mail\JobFailedMail;
use App\Mail\PlanActivatedMail;
use App\Mail\TrialStartedMail;
use App\Mail\WelcomeMail;
use App\Models\JobLog;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Central dispatcher for all merchant-facing transactional emails.
 *
 * Every method resolves the merchant's email safely and never throws —
 * a mail failure must never break the business flow that triggered it.
 */
class EmailService
{
    /**
     * Resolve the best contact email for a shop/user.
     * Prefers the Shopify store email, falls back to the user record.
     */
    public static function resolveEmail(?User $user, ?string $explicit = null): ?string
    {
        $candidates = [
            $explicit,
            $user?->storeDetails?->email,
            $user?->email,
        ];

        foreach ($candidates as $email) {
            $email = trim((string) $email);
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $email;
            }
        }

        return null;
    }

    /**
     * Friendly display name for the shop.
     */
    protected static function shopName(?User $user): ?string
    {
        return $user?->storeDetails?->shop_name ?: $user?->name;
    }

    /**
     * Low-level guarded send.
     */
    protected static function send(?string $email, $mailable, string $context): void
    {
        if (!$email) {
            Log::info("EmailService: skipped {$context} — no valid recipient email.");
            return;
        }

        try {
            Mail::to($email)->send($mailable);
        } catch (\Throwable $e) {
            Log::error("EmailService: failed to send {$context}: " . $e->getMessage());
        }
    }

    // ───────────────────────── Lifecycle ─────────────────────────

    public static function sendWelcome(?User $user, ?string $email = null): void
    {
        $email = self::resolveEmail($user, $email);
        self::send($email, new WelcomeMail(self::shopName($user)), 'welcome email');
    }

    public static function sendUninstall(?User $user, ?string $email = null, ?string $shopName = null): void
    {
        $email = self::resolveEmail($user, $email);
        $name = $shopName ?: self::shopName($user);
        self::send($email, new AppUninstalledMail($name), 'uninstall email');
    }

    // ───────────────────────── Credits ─────────────────────────

    public static function sendFreeCreditsUpdated(?User $user, int $credits): void
    {
        $email = self::resolveEmail($user);
        self::send($email, new FreeCreditsUpdatedMail($credits, self::shopName($user)), 'free-credits-updated email');
    }

    /**
     * Sent once per credit cycle when the user fully exhausts their credits.
     */
    public static function sendCreditsExhausted(?User $user): void
    {
        if (!$user) {
            return;
        }

        // De-dupe: only one exhausted email per reset cycle.
        $cycle = optional($user->credits_reset_at)->timestamp ?? 'na';
        $cacheKey = "credits_exhausted_notified:{$user->id}:{$cycle}";

        if (Cache::has($cacheKey)) {
            return;
        }

        $email = self::resolveEmail($user);
        if (!$email) {
            return;
        }

        Cache::put($cacheKey, true, now()->addDays(35));

        self::send(
            $email,
            new CreditsExhaustedMail((int) $user->credits, (int) $user->credits_used, self::shopName($user)),
            'credits-exhausted email'
        );
    }

    // ───────────────────────── Jobs ─────────────────────────

    public static function sendJobCompleted(JobLog $jobLog): void
    {
        $user = $jobLog->user;
        $email = self::resolveEmail($user);

        // Label/PDF jobs stash a downloadable ZIP url in the payload.
        $downloadUrl = is_array($jobLog->payload) ? ($jobLog->payload['download_url'] ?? null) : null;

        self::send(
            $email,
            new JobCompletedMail(
                jobTitle: $jobLog->title ?: 'Your task',
                total: $jobLog->total_items,
                processed: (int) $jobLog->processed_items,
                failed: (int) $jobLog->failed_items,
                shopName: self::shopName($user),
                downloadUrl: $downloadUrl,
            ),
            'job-completed email'
        );
    }

    // ───────────────────────── Plans & trials ─────────────────────────

    /**
     * Sent when a paid plan is activated (no active trial).
     */
    public static function sendPlanActivated(?User $user, string $planName, ?int $credits, bool $unlimited): void
    {
        $email = self::resolveEmail($user);
        self::send(
            $email,
            new PlanActivatedMail($planName, $credits, $unlimited, self::shopName($user)),
            'plan-activated email'
        );
    }

    /**
     * Sent when a plan with a free trial is activated.
     */
    public static function sendTrialStarted(?User $user, string $planName, int $trialDays, ?string $trialEndsAt = null): void
    {
        $email = self::resolveEmail($user);
        self::send(
            $email,
            new TrialStartedMail($planName, $trialDays, $trialEndsAt, self::shopName($user)),
            'trial-started email'
        );
    }

    /**
     * Sent when credits are added/refilled/reset.
     * $type: 'giveaway' | 'reset' | 'refill'
     */
    public static function sendCreditsAdded(?User $user, string $type, ?int $amount, int $newBalance): void
    {
        $email = self::resolveEmail($user);
        self::send(
            $email,
            new CreditsAddedMail($type, $amount, $newBalance, self::shopName($user)),
            'credits-added email'
        );
    }

    public static function sendJobFailed(JobLog $jobLog): void
    {
        $user = $jobLog->user;
        $email = self::resolveEmail($user);

        self::send(
            $email,
            new JobFailedMail(
                jobTitle: $jobLog->title ?: 'Your task',
                processed: (int) $jobLog->processed_items,
                failed: (int) $jobLog->failed_items,
                error: $jobLog->error_message,
                shopName: self::shopName($user),
            ),
            'job-failed email'
        );
    }
}
