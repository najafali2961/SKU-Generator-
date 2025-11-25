<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barcodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');

            // Stores Shopify's variant ID (e.g. 47718421299451)
            $table->unsignedBigInteger('variant_id')->unique();
            $table->index('variant_id');

            $table->string('barcode_value'); // Final value: real barcode → SKU → AUTO-
            $table->string('format')->default('UPC');
            $table->string('image_url')->nullable();
            $table->boolean('is_duplicate')->default(false);

            $table->timestamps();

            // Optional: prevent duplicate real barcodes across shop
            $table->unique(['product_id', 'barcode_value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barcodes');
    }
};
