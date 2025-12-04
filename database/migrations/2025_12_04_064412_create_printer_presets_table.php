<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('printer_presets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('brand');
            $table->string('type'); // thermal, laser, inkjet
            $table->json('settings');
            $table->json('supported_label_sizes');
            $table->boolean('is_system')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('printer_presets');
    }
};
