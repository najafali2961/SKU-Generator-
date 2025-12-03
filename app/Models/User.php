<?php

namespace  App\Models;

use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Osiset\ShopifyApp\Contracts\ShopModel as IShopModel;
use Osiset\ShopifyApp\Traits\ShopModel;

class User extends Authenticatable implements IShopModel
{
    use Notifiable;
    use ShopModel;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'email',
        'password',
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


    public function barcodePrinterSettings()
    {
        return $this->hasMany(\App\Models\BarcodePrinterSetting::class);
    }

    public function labelTemplates()
    {
        return $this->hasMany(\App\Models\LabelTemplate::class);
    }

    public function products()
    {
        return $this->hasMany(\App\Models\Product::class);
    }


    public function defaultLabelTemplate()
    {
        return $this->hasOne(LabelTemplate::class)->where('is_default', true);
    }
}
