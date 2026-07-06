<?php

use App\Models\Feature;
use App\Models\Plan;
use Illuminate\Database\Migrations\Migration;

/**
 * Data migration: replace the decorative pricing-page features (API Access,
 * Webhooks, SSO, ...) with the features the app actually has, and attach
 * them to the live plans by tier. Core tools stay on every plan (they are
 * monetized by credits); the gated extras drive upgrades.
 *
 * Admin can fine-tune assignments afterwards in Admin → Plans → Features.
 */
return new class extends Migration
{
    /** Features every plan includes (display-only, never gated in code). */
    private const CORE = [
        ['slug' => 'sku-generation', 'name' => 'SKU Generation', 'category' => 'core', 'sort_order' => 1],
        ['slug' => 'barcode-generation', 'name' => 'Barcode Generation', 'category' => 'core', 'sort_order' => 2],
        ['slug' => 'label-printing', 'name' => 'Label Printing (PDF)', 'category' => 'core', 'sort_order' => 3],
        ['slug' => 'audit-logs', 'name' => 'Job History & Logs', 'category' => 'core', 'sort_order' => 4],
    ];

    /** Gated workflow extras — unlocked from the mid tier up. */
    private const WORKFLOW = [
        ['slug' => 'csv-export', 'name' => 'CSV Export', 'category' => 'workflow', 'sort_order' => 10],
        ['slug' => 'barcode-csv-import', 'name' => 'CSV Barcode Import', 'category' => 'workflow', 'sort_order' => 11],
        ['slug' => 'custom-templates', 'name' => 'Custom Label Templates', 'category' => 'workflow', 'sort_order' => 12],
    ];

    /** Premium extras — top tier only. */
    private const PREMIUM = [
        ['slug' => 'qr-labels', 'name' => 'QR Code Labels', 'category' => 'premium', 'sort_order' => 20],
        ['slug' => 'priority-support', 'name' => 'Priority Support', 'category' => 'premium', 'sort_order' => 21],
    ];

    /** Legacy display-only features that don't exist in the app. */
    private const RETIRED_SLUGS = [
        'api-access', 'webhooks', 'multi-store', 'advanced-analytics', 'custom-branding', 'sso',
    ];

    public function up(): void
    {
        // 1. Upsert the real features.
        $bySlug = [];
        foreach ([...self::CORE, ...self::WORKFLOW, ...self::PREMIUM] as $data) {
            $feature = Feature::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'category' => $data['category'],
                    'sort_order' => $data['sort_order'],
                    'is_active' => true,
                ]
            );
            $bySlug[$data['slug']] = $feature->id;
        }

        // 2. Retire the fake ones (kept in DB for history, hidden everywhere).
        Feature::whereIn('slug', self::RETIRED_SLUGS)->update(['is_active' => false]);

        // 3. Attach to real (non-custom) plans by tier, using monthly credits
        //    as the tier signal so annual variants match their monthly twin:
        //    <= 2000 credits  -> core only
        //    <= 10000 credits -> core + workflow
        //    above / unlimited -> everything
        $coreIds = array_map(fn ($f) => $bySlug[$f['slug']], self::CORE);
        $workflowIds = array_map(fn ($f) => $bySlug[$f['slug']], self::WORKFLOW);
        $premiumIds = array_map(fn ($f) => $bySlug[$f['slug']], self::PREMIUM);

        $plans = Plan::where('name', 'not like', 'Custom Plan (%')->get();

        foreach ($plans as $plan) {
            if ($plan->unlimited_credits || $plan->monthly_credits > 10000) {
                $ids = [...$coreIds, ...$workflowIds, ...$premiumIds];
            } elseif ($plan->monthly_credits > 2000) {
                $ids = [...$coreIds, ...$workflowIds];
            } else {
                $ids = $coreIds;
            }

            $plan->features()->sync($ids);
        }

        // Custom plans intentionally get NO feature rows: a plan with zero
        // attached features is treated as "unconfigured" and unlocks all
        // gates (see User::featureGates()).
        Plan::where('name', 'like', 'Custom Plan (%')
            ->get()
            ->each(fn (Plan $plan) => $plan->features()->sync([]));
    }

    public function down(): void
    {
        // Data migration — no automatic rollback.
    }
};
