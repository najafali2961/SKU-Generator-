<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Disk reclaim. Drops:
     *  - products.description_html — written by sync, never read anywhere
     *  - products.variants — legacy JSON copy, superseded by the variants
     *    table (and it shadowed the variants() relationship on the model)
     *  - variants_shopify_variant_id_index / barcodes_variant_id_index —
     *    plain indexes duplicating the unique indexes on the same columns
     *
     * Dropping the products columns rebuilds the table online and needs
     * roughly the table's size in free disk as scratch space. Deploy this
     * off-peak and only with `df -h` headroom (the webhook deploy runs
     * migrate --force automatically on push).
     */
    public function up(): void
    {
        $dead = array_values(array_filter(
            ['description_html', 'variants'],
            fn ($col) => Schema::hasColumn('products', $col)
        ));

        if ($dead !== []) {
            Schema::table('products', fn (Blueprint $table) => $table->dropColumn($dead));
        }

        if (Schema::hasIndex('variants', 'variants_shopify_variant_id_index')) {
            Schema::table('variants', fn (Blueprint $table) => $table->dropIndex('variants_shopify_variant_id_index'));
        }

        if (Schema::hasIndex('barcodes', 'barcodes_variant_id_index')) {
            Schema::table('barcodes', fn (Blueprint $table) => $table->dropIndex('barcodes_variant_id_index'));
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (! Schema::hasColumn('products', 'description_html')) {
                $table->text('description_html')->nullable();
            }
            if (! Schema::hasColumn('products', 'variants')) {
                $table->json('variants')->nullable();
            }
        });

        if (! Schema::hasIndex('variants', 'variants_shopify_variant_id_index')) {
            Schema::table('variants', fn (Blueprint $table) => $table->index('shopify_variant_id'));
        }

        if (! Schema::hasIndex('barcodes', 'barcodes_variant_id_index')) {
            Schema::table('barcodes', fn (Blueprint $table) => $table->index('variant_id'));
        }
    }
};
