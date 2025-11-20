<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('variants', function (Blueprint $table) {
            // Make sure SKU column exists before adding unique
            $table->string('sku')->nullable()->change();
            // $table->unique('sku');
        });
    }

    public function down(): void
    {
        Schema::table('variants', function (Blueprint $table) {
            $table->dropUnique(['sku']);
        });
    }
};
