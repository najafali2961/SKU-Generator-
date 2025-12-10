<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        // Clean start — safe even if charges exist
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('plans')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $plans = [
            [
                'type'          => 'RECURRING',
                'name'          => 'Basic',
                'price'         => 9.99,
                'interval'      => 'EVERY_30_DAYS',
                'trial_days'    => 7,
                'capped_amount' => null,
                'terms'         => null,
                'test'          => false,
                'on_install'    => false,
            ],
            [
                'type'          => 'RECURRING',
                'name'          => 'Pro',
                'price'         => 19.99,
                'interval'      => 'EVERY_30_DAYS',
                'trial_days'    => 14,
                'capped_amount' => 100.00,
                'terms'         => 'Up to $100 extra usage charges per month',
                'test'          => false,        // Real billing
                'on_install'    => true,         // This one shows on install
            ],
            [
                'type'          => 'RECURRING',
                'name'          => 'Pro Annual',
                'price'         => 199.00,
                'interval'      => 'ANNUAL',
                'trial_days'    => 14,
                'capped_amount' => 100.00,
                'terms'         => 'Up to $100 extra usage charges per year',
                'test'          => false,
                'on_install'    => false,
            ],
        ];

        foreach ($plans as $plan) {
            DB::table('plans')->updateOrInsert(
                ['name' => $plan['name']], // unique by name
                array_merge($plan, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }

        // Force only Pro to be on_install
        DB::table('plans')->update(['on_install' => false]);
        DB::table('plans')->where('name', 'Pro')->update(['on_install' => true]);

        $this->command->info('Plans seeded successfully! Pro plan is set as on_install.');
    }
}
