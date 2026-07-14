<?php

namespace App\Support;

use App\Models\User;

/**
 * What support sees in Crisp about the merchant they're talking to.
 *
 * The visitor is named after the store's domain rather than "visitor276444",
 * and the session carries the facts a SKU/barcode ticket actually turns on:
 * the app plan, whether it's a development store, and the credit balance —
 * "generation stopped working" is nearly always an empty credit balance.
 *
 * The giveaway/custom-credit deep links support relies on are preserved: they
 * are built the same way as before (protocol stripped, falling back to the
 * myshopify domain), because HomeController::resolveShopByDomain looks the shop
 * up by exactly that string.
 */
class CrispSession
{
    public const APP_NAME = 'AiroSKU';

    /**
     * @return array{nickname: string, email: ?string, company: ?array, data: array<int, array{0: string, 1: string}>, segments: array<int, string>}|null
     */
    public static function for(?User $shop): ?array
    {
        if (! $shop) {
            return null;
        }

        $detail = $shop->storeDetails;

        $myshopify = self::host($detail?->shopify_domain) ?? self::host($shop->name);
        $storefront = self::host($detail?->primary_domain) ?? $myshopify;
        $handle = $myshopify ? str_replace('.myshopify.com', '', $myshopify) : null;

        $isDev = $shop->isDevStore();
        $paid = $shop->hasPaidPlan();
        $unlimitedCredits = $shop->hasUnlimitedCredits();

        // The support giveaway routes resolve the shop from this exact string —
        // the storefront domain when it's known, the myshopify domain otherwise.
        $giveawayDomain = self::giveawayDomain($shop, $detail?->primary_domain);

        $data = [
            'store_id' => (string) $shop->id,
            'store_name' => $detail?->shop_name ?: $myshopify,
            'store_domain' => $storefront,
            'myshopify_domain' => $myshopify,
            'store_admin' => $handle ? "https://admin.shopify.com/store/{$handle}" : null,
            'store_email' => $detail?->email,
            'store_phone' => $detail?->phone,
            'shopify_plan' => $detail?->plan_name,
            'dev_store' => self::yesNo($isDev),
            'shopify_plus' => $detail?->shopify_plus ? 'yes' : 'no',
            'country' => $detail?->country,
            'currency' => $detail?->currency,
            'app_name' => self::APP_NAME,
            'app_plan' => $shop->plan->name ?? ($shop->isFreemium() ? 'Free' : 'None'),
            // The first thing to check when a merchant says generation stopped.
            'credits' => $unlimitedCredits
                ? 'unlimited'
                : $shop->credits_used.' used / '.(int) $shop->credits.' allocated ('.$shop->getAvailableCredits().' left)',
            'credits_reset_at' => $shop->credits_reset_at?->toDateString(),
            'giveaway_claimed' => self::yesNo((bool) $shop->has_claimed_giveaway),
            'giveaway_link' => url('/support/giveaway/'.$giveawayDomain),
            'custom_credits' => url('/support/giveaway/'.$giveawayDomain.'/100'),
            'installed_at' => $shop->created_at?->toDateString(),
        ];

        $data = array_filter($data, fn ($value) => $value !== null && $value !== '');

        return [
            'nickname' => $storefront ?: $myshopify ?: "Store #{$shop->id}",
            'email' => $detail?->email,
            'company' => $detail?->shop_name || $storefront
                ? [
                    $detail?->shop_name ?: $storefront,
                    (object) array_filter([
                        'url' => $storefront ? "https://{$storefront}" : null,
                        'domain' => $storefront,
                    ]),
                ]
                : null,
            'segments' => array_values(array_filter([
                'airo-sku',
                $isDev ? 'dev-store' : null,
                $paid ? 'paid' : null,
                (! $paid) ? 'free' : null,
                (! $unlimitedCredits && $shop->getAvailableCredits() <= 0) ? 'out-of-credits' : null,
            ])),
            'data' => array_map(
                fn ($key, $value) => [$key, (string) $value],
                array_keys($data),
                array_values($data),
            ),
        ];
    }

    /** Exactly what the Blade used to build: protocol stripped, myshopify fallback. */
    private static function giveawayDomain(User $shop, ?string $primaryDomain): string
    {
        return str_replace(['https://', 'http://'], '', $primaryDomain ?: (string) $shop->name);
    }

    /** Bare hostname — primary_domain arrives from Shopify as a full URL. */
    private static function host(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $host = parse_url(str_contains($value, '//') ? $value : "https://{$value}", PHP_URL_HOST);

        return $host ?: null;
    }

    private static function yesNo(bool $value): string
    {
        return $value ? 'yes' : 'no';
    }
}
