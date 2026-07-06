<?php

namespace Database\Seeders;

use App\Models\Feature;
use Illuminate\Database\Seeder;

class FeatureSeeder extends Seeder
{
    public function run(): void
    {
        // Real app features only. Core = every plan (monetized by credits,
        // never gated); workflow/premium = plan-gated extras (see
        // User::FEATURE_GATES). Kept in sync with the
        // 2026_07_06_000003_setup_real_plan_features migration.
        $features = [
            ['name' => 'SKU Generation', 'slug' => 'sku-generation', 'category' => 'core', 'sort_order' => 1],
            ['name' => 'Barcode Generation', 'slug' => 'barcode-generation', 'category' => 'core', 'sort_order' => 2],
            ['name' => 'Label Printing (PDF)', 'slug' => 'label-printing', 'category' => 'core', 'sort_order' => 3],
            ['name' => 'Job History & Logs', 'slug' => 'audit-logs', 'category' => 'core', 'sort_order' => 4],
            ['name' => 'CSV Export', 'slug' => 'csv-export', 'category' => 'workflow', 'sort_order' => 10],
            ['name' => 'CSV Barcode Import', 'slug' => 'barcode-csv-import', 'category' => 'workflow', 'sort_order' => 11],
            ['name' => 'Custom Label Templates', 'slug' => 'custom-templates', 'category' => 'workflow', 'sort_order' => 12],
            ['name' => 'QR Code Labels', 'slug' => 'qr-labels', 'category' => 'premium', 'sort_order' => 20],
            ['name' => 'Priority Support', 'slug' => 'priority-support', 'category' => 'premium', 'sort_order' => 21],
        ];

        foreach ($features as $feature) {
            Feature::updateOrCreate(['slug' => $feature['slug']], $feature + ['is_active' => true]);
        }
    }
}
