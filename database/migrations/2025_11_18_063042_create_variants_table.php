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
        Schema::create('variants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id'); // FK to your products table
            $table->string('shopify_variant_id')->unique();

            $table->string('title')->nullable();
            $table->string('sku')->nullable();
            $table->string('option1')->nullable();
            $table->string('option2')->nullable();
            $table->string('option3')->nullable();

            $table->decimal('price', 10, 2)->nullable();
            $table->integer('inventory_quantity')->nullable();

            $table->timestamps();

            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variants');
    }
};
