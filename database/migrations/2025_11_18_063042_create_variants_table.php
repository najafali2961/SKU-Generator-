<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('shopify_variant_id')->unique(); // ← Shopify's real ID
            $table->index('shopify_variant_id');
            $table->string('title')->nullable();
            $table->string('sku')->nullable();
            $table->string('barcode')->nullable(); // ← Real UPC/EAN from Shopify
            $table->index('barcode');
            $table->string('option1')->nullable();
            $table->string('option2')->nullable();
            $table->string('option3')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('inventory_quantity')->default(0);
            $table->string('image')->nullable();
            $table->string('image_alt')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variants');
    }
};
