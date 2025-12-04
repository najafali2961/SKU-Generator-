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
        Schema::create('barcode_printer_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Label Configuration
            $table->string('label_name')->default('Default Label');
            $table->string('barcode_type')->default('code128'); // code128, ean13, ean8, upca, qr, etc
            $table->string('barcode_format')->default('linear'); // linear, 2d

            // Paper Setup
            $table->string('paper_size')->default('a4'); // a4, letter, 4x6, 3x5
            $table->string('paper_orientation')->default('portrait'); // portrait, landscape
            $table->decimal('paper_width', 8, 2)->default(210); // mm
            $table->decimal('paper_height', 8, 2)->default(297); // mm
            $table->decimal('page_margin_top', 8, 2)->default(10);
            $table->decimal('page_margin_bottom', 8, 2)->default(10);
            $table->decimal('page_margin_left', 8, 2)->default(10);
            $table->decimal('page_margin_right', 8, 2)->default(10);

            // Label Dimensions
            $table->decimal('label_width', 8, 2)->default(100); // mm
            $table->decimal('label_height', 8, 2)->default(50); // mm
            $table->integer('labels_per_row')->default(2);
            $table->integer('labels_per_column')->default(5);
            $table->decimal('label_spacing_horizontal', 8, 2)->default(5);
            $table->decimal('label_spacing_vertical', 8, 2)->default(5);

            // Barcode Configuration
            $table->decimal('barcode_width', 8, 2)->default(80); // mm
            $table->decimal('barcode_height', 8, 2)->default(25); // mm
            $table->integer('barcode_scale')->default(1);
            $table->integer('barcode_line_width')->default(1);
            $table->string('barcode_position')->default('top'); // top, center, bottom

            // QR Code Specific
            $table->integer('qr_error_correction')->default(7); // 7%, 15%, 25%, 30%
            $table->integer('qr_module_size')->default(5);
            $table->text('qr_custom_format')->nullable();
            // Text/Font Settings
            $table->json('display_attributes')->default('[]'); // Fields to display on label
            $table->string('font_family')->default('Arial');
            $table->integer('font_size')->default(10);
            $table->string('font_color')->default('#000000');

            // Product Info Display
            $table->boolean('show_product_title')->default(true);
            $table->boolean('show_sku')->default(true);
            $table->boolean('show_price')->default(false);
            $table->boolean('show_variant')->default(true);
            $table->boolean('show_qr_code')->default(true);
            $table->boolean('show_linear_barcode')->default(true);

            // Advanced Options
            $table->json('custom_fields')->nullable(); // Custom text/images
            $table->string('barcode_encoding')->default('UTF-8');
            $table->boolean('include_checksum')->default(true);
            $table->boolean('print_barcode_value')->default(true);

            $table->boolean('show_vendor')->default(false);
            $table->boolean('show_product_type')->default(false);
            $table->json('text_layout')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('barcode_printer_settings');
    }
};
