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
        Schema::table('users', function (Blueprint $table) {
            // Set when the paid-launch announcement email was queued for the
            // shop, so billing:announce-launch never double-sends.
            $table->timestamp('launch_announced_at')->nullable()->after('has_claimed_giveaway');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('launch_announced_at');
        });
    }
};
