<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBarcodeCountersTable extends Migration
{
    public function up()
    {
        Schema::create('barcode_counters', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->string('format', 20)->default('UPC'); // Track per format
            $table->bigInteger('counter')->default(1);
            $table->timestamps();

            $table->unique(['shop_id', 'format']);
            $table->index('shop_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('barcode_counters');
    }
}
