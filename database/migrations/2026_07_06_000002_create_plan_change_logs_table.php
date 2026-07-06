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
        Schema::create('plan_change_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('shop_domain')->nullable();
            $table->unsignedBigInteger('previous_plan_id')->nullable();
            $table->string('previous_plan_name')->nullable();
            $table->unsignedBigInteger('new_plan_id')->nullable();
            $table->string('new_plan_name')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->string('interval')->nullable();
            // billing | merchant_cancel | admin | uninstall
            $table->string('source', 32);
            $table->boolean('test')->default(false);
            $table->string('charge_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // No FK to users: history must survive store hard-deletes.
            $table->index(['user_id', 'created_at']);
            $table->index('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_change_logs');
    }
};
