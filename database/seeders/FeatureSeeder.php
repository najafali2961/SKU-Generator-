<?php

namespace Database\Seeders;

use App\Models\Feature;
use Illuminate\Database\Seeder;

class FeatureSeeder extends Seeder
{
    public function run(): void
    {
        $features = [
            ['name' => 'SKU Generation', 'slug' => 'sku-generation', 'category' => 'core', 'sort_order' => 1],
            ['name' => 'Barcode Generation', 'slug' => 'barcode-generation', 'category' => 'core', 'sort_order' => 2],
            ['name' => 'Label Printing', 'slug' => 'label-printing', 'category' => 'core', 'sort_order' => 3],
            ['name' => 'API Access', 'slug' => 'api-access', 'category' => 'advanced', 'sort_order' => 4],
            ['name' => 'Webhooks', 'slug' => 'webhooks', 'category' => 'advanced', 'sort_order' => 5],
            ['name' => 'Priority Support', 'slug' => 'priority-support', 'category' => 'support', 'sort_order' => 6],
            ['name' => 'Multi-store Support', 'slug' => 'multi-store', 'category' => 'advanced', 'sort_order' => 7],
            ['name' => 'Advanced Analytics', 'slug' => 'advanced-analytics', 'category' => 'advanced', 'sort_order' => 8],
            ['name' => 'Custom Branding', 'slug' => 'custom-branding', 'category' => 'advanced', 'sort_order' => 9],
            ['name' => 'SSO Integration', 'slug' => 'sso', 'category' => 'integration', 'sort_order' => 10],
            ['name' => 'Audit Logs', 'slug' => 'audit-logs', 'category' => 'support', 'sort_order' => 11],
        ];

        foreach ($features as $feature) {
            Feature::firstOrCreate(['slug' => $feature['slug']], $feature);
        }
    }
}
