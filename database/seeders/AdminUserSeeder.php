<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        Admin::updateOrCreate(
            ['email' => 'support@airoapps.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('Wixpa@2026'), // change password
                'email_verified_at' => now(),
            ]
        );
    }
}
