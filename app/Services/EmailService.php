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
     * Build the Shopify admin deep link that opens the embedded app
     * in the merchant's own store, e.g.
     * https://admin.shopify.com/store/{store}/apps/{app_handle}
     *
     * The app identifier prefers the configured app handle but falls back
     * to the API key (client id) — which is always present — so the link
     * keeps working even when SHOPIFY_APP_HANDLE is missing from the
     * (possibly cached) production config. Both forms open the embedded
     * app with shop context instead of hitting the bare /authenticate route.
     *
     * Falls back to the bare app URL only when we can't derive the store.
     */
    public static function appUrl(?User $user): string
    {
        $store = self::storeHandle($user);
        if (! $store) {
            return config('app.url');
        }

        // Preferred: the human-readable app handle on the new admin host.
        $handle = trim((string) config('shopify-app.app_handle'));
        if ($handle !== '') {
            return "https://admin.shopify.com/store/{$store}/apps/{$handle}";
        }

        // Fallback: the API key (client id) is always configured and is
        // accepted as the app identifier on the legacy admin host.
        $apiKey = trim((string) config('shopify-app.api_key'));
        if ($apiKey !== '') {
            return "https://{$store}.myshopify.com/admin/apps/{$apiKey}";
        }

        return config('app.url');
    }

    /**
     * Derive the bare store handle (without scheme or .myshopify.com)
     * used to build admin deep links.
     */
    protected static function storeHandle(?User $user): ?string
    {
        $domain = $user?->storeDetails?->shopify_domain ?: $user?->name;
        if (! $domain) {
            return null;
        }

        // Strip any scheme, trailing slash and the .myshopify.com suffix.
        $domain = trim((string) $domain);
        $domain = preg_replace('#^https?://#i', '', $domain);
        $domain = rtrim($domain, '/');
        $domain = str_replace('.myshopify.com', '', $domain);

        return $domain !== '' ? $domain : null;
    }

    /**
     * Low-level guarded send. When a user is supplied, the mailable's
     * "open the app" URL is set to that merchant's admin deep link.
     */
    protected static function send(?string $email, $mailable, string $context, ?User $user = null): void
    {
        if (! $email) {
            Log::info("EmailService: skipped {$context} — no valid recipient email.");

            return;
        }

        if ($user !== null && property_exists($mailable, 'appUrl')) {
            $mailable->appUrl = self::appUrl($user);
        }

        try {
            Mail::to($email)->send($mailable);
        } catch (\Throwable $e) {
            Log::error("EmailService: failed to send {$context}: ".$e->getMessage());
        }
    }

    // ───────────────────────── Lifecycle ─────────────────────────

    public static function sendWelcome(?User $user, ?string $email = null): void
    {
        $email = self::resolveEmail($user, $email);
        self::send($email, new WelcomeMail(self::shopName($user)), 'welcome email', $user);
    }

    public static function sendUninstall(?User $user, ?string $email = null, ?string $shopName = null): void
    {
        $email = self::resolveEmail($user, $email);
        $name = $shopName ?: self::shopName($user);
        self::send($email, new AppUninstalledMail($name), 'uninstall email', $user);
    }

    // ───────────────────────── Credits ─────────────────────────

    public static function sendFreeCreditsUpdated(?User $user, int $credits): void
    {
        $email = self::resolveEmail($user);
        self::send($email, new FreeCreditsUpdatedMail($credits, self::shopName($user)), 'free-credits-updated email', $user);
    }

    /**
     * Sent once per credit cycle when the user fully exhausts their credits.
     */
    public static function sendCreditsExhausted(?User $user): void
    {
        if (! $user) {
            return;
        }

        // De-dupe: only one exhausted email per reset cycle.
        $cycle = optional($user->credits_reset_at)->timestamp ?? 'na';
        $cacheKey = "credits_exhausted_notified:{$user->id}:{$cycle}";

        if (Cache::has($cacheKey)) {
            return;
        }

        $email = self::resolveEmail($user);
        if (! $email) {
            return;
        }

        Cache::put($cacheKey, true, now()->addDays(35));

        self::send(
            $email,
            new CreditsExhaustedMail((int) $user->credits, (int) $user->credits_used, self::shopName($user)),
            'credits-exhausted email',
            $user
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
            'job-completed email',
            $user
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
            'plan-activated email',
            $user
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
            'trial-started email',
            $user
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
            'credits-added email',
            $user
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
            'job-failed email',
            $user
        );
    }
}
