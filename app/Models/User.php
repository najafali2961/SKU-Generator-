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
}
