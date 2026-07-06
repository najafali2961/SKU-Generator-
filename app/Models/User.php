<?php

namespace App\Models;

use App\Traits\HasCredits;
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Osiset\ShopifyApp\Contracts\ShopModel as IShopModel;
use Osiset\ShopifyApp\Traits\ShopModel;

class User extends Authenticatable implements IShopModel
{
    use Notifiable;
    use ShopModel;
    use HasCredits;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'plan_id',
        'shopify_freemium',
        'credits',
        'credits_used',
        'credits_reset_at',
        'has_claimed_giveaway',
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'credits' => 'integer',
        'credits_used' => 'integer',
        'credits_reset_at' => 'datetime',
        'shopify_freemium' => 'boolean',
        'has_claimed_giveaway' => 'boolean',
    ];

    /**
     * Get barcode printer settings
     */
    public function barcodePrinterSettings()
    {
        return $this->hasMany(BarcodePrinterSetting::class);
    }

    /**
     * Get label templates
     */
    public function labelTemplates()
    {
        return $this->hasMany(LabelTemplate::class);
    }

    /**
     * Get products
     */
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Get bulk job logs (SKU/barcode/label jobs)
     */
    public function jobLogs()
    {
        return $this->hasMany(JobLog::class);
    }

    /**
     * Get default label template
     */
    public function defaultLabelTemplate()
    {
        return $this->hasOne(LabelTemplate::class)->where('is_default', true);
    }

    /**
     * Check if user is on freemium plan
     */
    public function isFreemium(): bool
    {
        return $this->shopify_freemium == 1 || $this->plan_id === null;
    }

    /**
     * Check if user has active paid plan
     */
    public function hasPaidPlan(): bool
    {
        return !$this->isFreemium() && $this->plan_id !== null;
    }
    public function storeDetails()
    {
        return $this->hasOne(StoreDetail::class);
    }

    /**
     * Plan change history (billing activations, cancels, admin overrides).
     */
    public function planChangeLogs()
    {
        return $this->hasMany(PlanChangeLog::class);
    }

    /**
     * Plan-gated features (slug => fallback label). Core tools (SKU/barcode
     * generation, label printing) are NEVER gated — they are monetized by
     * credits. These are the premium extras that drive plan upgrades. The UI
     * shows a plan badge + upgrade prompt instead of hiding the control.
     */
    public const FEATURE_GATES = [
        'csv-export' => 'CSV Export',
        'barcode-csv-import' => 'CSV Barcode Import',
        'custom-templates' => 'Custom Label Templates',
        'qr-labels' => 'QR Code Labels',
    ];

    /** @var array<string, array{enabled: bool, label: string, required_plan: ?string}>|null */
    protected ?array $featureGateCache = null;

    public function hasFeature(string $slug): bool
    {
        return (bool) ($this->featureGates()[$slug]['enabled'] ?? true);
    }

    /**
     * Resolve every gate for this store. Rules:
     * - Gate rows come from the features table (admin-managed per plan).
     * - Missing/inactive feature row => gate is open (never break the app
     *   because a row was deleted).
     * - Free tier (no plan) => gated features are locked.
     * - Paid plan with NO features attached at all => treated as
     *   unconfigured => everything open (protects paying merchants from an
     *   incomplete admin setup; custom plans intentionally work this way).
     */
    public function featureGates(): array
    {
        if ($this->featureGateCache !== null) {
            return $this->featureGateCache;
        }

        $features = Feature::where('is_active', true)
            ->whereIn('slug', array_keys(self::FEATURE_GATES))
            ->get()
            ->keyBy('slug');

        $planFeatureIds = ($this->plan_id && $this->plan)
            ? $this->plan->features->pluck('id')
            : null;

        $gates = [];

        foreach (self::FEATURE_GATES as $slug => $fallbackLabel) {
            $feature = $features->get($slug);

            if (!$feature) {
                $gates[$slug] = ['enabled' => true, 'label' => $fallbackLabel, 'required_plan' => null];
                continue;
            }

            if ($planFeatureIds === null) {
                $enabled = false;
            } else {
                $enabled = $planFeatureIds->isEmpty() || $planFeatureIds->contains($feature->id);
            }

            $requiredPlan = null;
            if (!$enabled) {
                $requiredPlan = Plan::where('is_visible', true)
                    ->where('name', 'not like', 'Custom Plan (%')
                    ->whereHas('features', fn ($q) => $q->whereKey($feature->id))
                    ->orderBy('price')
                    ->value('name');
            }

            $gates[$slug] = [
                'enabled' => $enabled,
                'label' => $feature->name ?: $fallbackLabel,
                'required_plan' => $requiredPlan,
            ];
        }

        return $this->featureGateCache = $gates;
    }

    /**
     * Human message + consistent 403 payload for a locked feature endpoint.
     */
    public function featureLockedResponse(string $slug): \Illuminate\Http\JsonResponse
    {
        $gate = $this->featureGates()[$slug] ?? null;
        $label = $gate['label'] ?? 'This feature';
        $plan = $gate['required_plan'] ?? null;

        return response()->json([
            'success' => false,
            'feature_locked' => true,
            'feature' => $slug,
            'message' => $plan
                ? "{$label} is available on the {$plan} plan. Upgrade to unlock it."
                : "{$label} requires a plan upgrade.",
        ], 403);
    }

    /**
     * Is this a Shopify development/partner-test store?
     *
     * Dev stores are the ONLY stores allowed to receive test billing charges
     * (see DevAwareChargeHelper). Primary signal is Shopify's own
     * plan.partnerDevelopment flag synced into store_details; rows synced
     * before that column existed fall back to a plan-name match.
     */
    public function isDevStore(): bool
    {
        $detail = $this->storeDetails;

        if ($detail && $detail->partner_development !== null) {
            return (bool) $detail->partner_development;
        }

        $planName = strtolower(trim((string) ($detail?->plan_name ?? '')));

        return in_array($planName, [
            'developer preview',
            'development',
            'partner test',
            'affiliate',
            'staff',
            'staff business',
        ], true);
    }
}
