<?php

// database/migrations/xxxx_xx_xx_create_job_activity_logs_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_log_id')->constrained('job_logs')->onDelete('cascade');
            $table->string('level'); // info, success, warning, error
            $table->string('title');
            $table->text('message')->nullable();
            $table->json('context')->nullable(); // optional extra data
            $table->timestamp('logged_at')->useCurrent();
            $table->timestamps();

            $table->index(['job_log_id', 'level']);
            $table->index('logged_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_activity_logs');
    }
};
