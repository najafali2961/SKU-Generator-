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
        Schema::table('barcode_printer_settings', function (Blueprint $table) {
            $table->string('qr_data_source')->default('barcode');
            $table->boolean('show_barcode_value')->default(true);
            $table->integer('title_font_size')->default(12);
            $table->boolean('title_bold')->default(true);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('barcode_printer_settings', function (Blueprint $table) {
            $table->dropColumn(['qr_data_source', 'show_barcode_value', 'title_font_size', 'title_bold']);
        });
    }
};
