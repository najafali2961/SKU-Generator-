<?php

// database/migrations/xxxx_xx_xx_create_job_logs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('type')->index(); // e.g., 'sku_generation'
            $table->string('status')->default('pending')->index(); // pending, running, completed, failed
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->json('payload')->nullable(); // store settings, filters, etc.
            $table->integer('total_items')->nullable();
            $table->integer('processed_items')->default(0);
            $table->integer('failed_items')->default(0);
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_logs');
    }
};
