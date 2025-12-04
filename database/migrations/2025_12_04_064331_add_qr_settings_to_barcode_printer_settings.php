<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('barcode_printer_settings', function (Blueprint $table) {
            // QR Code Configuration
            // $table->string('qr_data_source')->default('barcode')->after('barcode_type');
            $table->text('qr_custom_format')->nullable()->after('qr_data_source');

            // Text Layout Configuration
            // $table->json('text_layout')->nullable()->after('title_bold');
        });
    }

    public function down()
    {
        Schema::table('barcode_printer_settings', function (Blueprint $table) {
            $table->dropColumn(['qr_data_source', 'qr_custom_format', 'text_layout']);
        });
    }
};
