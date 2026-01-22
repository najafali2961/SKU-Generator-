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
        Schema::create('store_details', function (Blueprint $table) {
            $table->id();
            $table->string("shop_id")->nullable();
            $table->string("shop_name")->nullable();
            $table->string("email")->nullable();
            $table->string('phone')->nullable();
            $table->text('description')->nullable();
            $table->string('plan_name')->nullable();
            $table->string('shopify_plus')->nullable();
            $table->text('shopify_domain')->nullable();
            $table->text('primary_domain')->nullable();
            $table->string('country')->nullable();
            $table->string('currency')->nullable();
            $table->unsignedBigInteger("user_id");
            $table->foreign('user_id')->on('users')->references('id')
                ->onUpdate('cascade')->onDelete('cascade'); // Link to users table
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_details');
    }
};
