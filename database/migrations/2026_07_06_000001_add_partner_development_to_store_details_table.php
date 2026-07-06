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
        Schema::table('store_details', function (Blueprint $table) {
            // Shopify's plan.partnerDevelopment flag. Null = not synced yet
            // (falls back to a plan_name match in User::isDevStore()).
            // Dev stores get TEST billing charges; everyone else pays live.
            $table->boolean('partner_development')->nullable()->after('plan_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_details', function (Blueprint $table) {
            $table->dropColumn('partner_development');
        });
    }
};
