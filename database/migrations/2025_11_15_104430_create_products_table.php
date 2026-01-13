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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('shopify_id')->unique();
            $table->string('title');
            $table->text('description_html')->nullable();
            $table->string('status')->nullable()->index();
            $table->decimal('price', 10, 2)->nullable();
            $table->integer('stock')->nullable();
            $table->string('vendor')->nullable()->index();
            $table->string('product_type')->nullable()->index();
            // $table->json('tags')->nullable();
            $table->text('tags')->nullable();
            $table->json('images')->nullable();
            $table->json('variants')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
