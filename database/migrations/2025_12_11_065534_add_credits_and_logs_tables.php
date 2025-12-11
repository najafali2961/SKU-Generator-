<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add credits columns to users table
        Schema::table('users', function (Blueprint $table) {
            $table->integer('credits')->default(0)->after('plan_id');
            $table->integer('credits_used')->default(0)->after('credits');
            $table->timestamp('credits_reset_at')->nullable()->after('credits_used');
        });

        // Modify plans table to add credit-based fields
        Schema::table('plans', function (Blueprint $table) {
            $table->integer('monthly_credits')->default(0)->after('price');
            $table->boolean('unlimited_credits')->default(false)->after('monthly_credits');
        });

        // Create credit_usage_logs table for tracking
        Schema::create('credit_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('feature'); // 'sku_generation', 'barcode_generation', 'barcode_import', 'label_printing'
            $table->integer('credits_used');
            $table->integer('credits_before');
            $table->integer('credits_after');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index('feature');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_usage_logs');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['monthly_credits', 'unlimited_credits']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['credits', 'credits_used', 'credits_reset_at']);
        });
    }
};
