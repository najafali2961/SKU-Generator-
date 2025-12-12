<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Osiset\ShopifyApp\Storage\Models\Plan;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Fix: Cannot TRUNCATE because charges.plan_id has FK to plans.id
        // So use delete() instead — safe and does not break FK constraints
        DB::table('plans')->delete();

        $plans = [
            [
                'type' => 'RECURRING',
                'name' => 'Basic',
                'price' => 9.99,
                'interval' => 'EVERY_30_DAYS',
                'capped_amount' => null,
                'terms' => null,
                'trial_days' => 7,
                'test' => false,
                'on_install' => true,
                'monthly_credits' => 100,
                'unlimited_credits' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type' => 'RECURRING',
                'name' => 'Pro',
                'price' => 29.99,
                'interval' => 'EVERY_30_DAYS',
                'capped_amount' => null,
                'terms' => null,
                'trial_days' => 7,
                'test' => false,
                'on_install' => false,
                'monthly_credits' => 500,
                'unlimited_credits' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type' => 'RECURRING',
                'name' => 'Pro Annual',
                'price' => 299.99,
                'interval' => 'ANNUAL',
                'capped_amount' => null,
                'terms' => 'Save 17% with annual billing',
                'trial_days' => 7,
                'test' => false,
                'on_install' => false,
                'monthly_credits' => 6000,
                'unlimited_credits' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type' => 'RECURRING',
                'name' => 'Unlimited',
                'price' => 99.99,
                'interval' => 'EVERY_30_DAYS',
                'capped_amount' => null,
                'terms' => 'Unlimited usage for power users',
                'trial_days' => 7,
                'test' => false,
                'on_install' => false,
                'monthly_credits' => 0,
                'unlimited_credits' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($plans as $plan) {
            Plan::create($plan);
        }

        $this->command->info('Plans seeded successfully with credit limits!');
    }
}
