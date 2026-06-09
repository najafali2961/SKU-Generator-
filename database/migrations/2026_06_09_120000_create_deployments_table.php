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
        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->string('commit_hash', 64)->index();
            $table->string('commit_short', 16);
            $table->string('commit_subject')->nullable();
            $table->string('commit_author')->nullable();
            $table->string('branch')->nullable();
            $table->timestamp('committed_at')->nullable();
            $table->string('php_version')->nullable();
            $table->string('laravel_version')->nullable();
            // How the entry was logged: auto (detected on first request after a
            // new commit went live), webhook (the deploy script ran `deploy:record`),
            // or manual.
            $table->string('source')->default('auto');
            $table->timestamp('deployed_at')->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deployments');
    }
};
