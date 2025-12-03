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
        Schema::create('print_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('barcode_printer_setting_id')->constrained('barcode_printer_settings')->onDelete('cascade');

            $table->json('selected_variants'); // Array of variant IDs to print
            $table->integer('quantity_per_variant')->default(1);
            $table->integer('total_labels')->default(0);
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            $table->text('error_message')->nullable();

            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('print_jobs');
    }
};
