<?php
// ==============================================
// FIXED MIGRATION: Create Features Table
// WITHOUT FOREIGN KEY CONSTRAINTS
// ==============================================
// database/migrations/2025_12_15_065519_create_features_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('features', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->string('category')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });

        // Create plan_features junction table WITHOUT foreign keys
        Schema::create('plan_features', function (Blueprint $table) {
            $table->id();

            // Use integer (same as plans table from Shopify package)
            $table->integer('plan_id');
            $table->integer('feature_id');

            $table->timestamps();

            // Add unique constraint
            $table->unique(['plan_id', 'feature_id']);

            // Add indexes for queries
            $table->index('plan_id');
            $table->index('feature_id');

            // Optional: Add foreign key if needed later
            // For now, we'll manage this in the application layer
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_features');
        Schema::dropIfExists('features');
    }
};
