<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            ['key' => 'free_plan_credits', 'value' => '500'],
            ['key' => 'yearly_discount_badge', 'value' => 'Get 2 Months Free!'],
            ['key' => 'custom_credit_price_per_unit', 'value' => '0.05'],
            ['key' => 'custom_credit_min_amount', 'value' => '1000'],
        ];

        foreach ($settings as $setting) {
            Setting::firstOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}
