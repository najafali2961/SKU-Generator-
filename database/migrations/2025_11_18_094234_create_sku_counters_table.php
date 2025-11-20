<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('sku_counters', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('product_id')->nullable();
            $table->unsignedBigInteger('counter')->default(0);
            $table->timestamps();

            $table->unique(['shop_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sku_counters');
    }
};
