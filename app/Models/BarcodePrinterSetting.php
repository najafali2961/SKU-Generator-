<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarcodePrinterSetting extends Model
{
    protected $fillable = [
        'user_id',
        'label_name',
        'barcode_type',
        'barcode_format',
        'paper_size',
        'paper_orientation',
        'paper_width',
        'paper_height',
        'page_margin_top',
        'page_margin_bottom',
        'page_margin_left',
        'page_margin_right',
        'label_width',
        'label_height',
        'labels_per_row',
        'labels_per_column',
        'label_spacing_horizontal',
        'label_spacing_vertical',
        'barcode_width',
        'barcode_height',
        'barcode_scale',
        'barcode_line_width',
        'barcode_position',
        'qr_error_correction',
        'qr_module_size',
        'display_attributes',
        'font_family',
        'font_size',
        'font_color',
        'show_product_title',
        'show_sku',
        'show_price',
        'show_variant',
        'show_qr_code',
        'show_linear_barcode',
        'custom_fields',
        'barcode_encoding',
        'include_checksum',
        'print_barcode_value',
        'qr_data_source',
        'show_barcode_value',
        'title_font_size',
        'title_bold',
        'show_vendor',
        'show_product_type',
        'text_layout'
    ];

    protected $casts = [
        'display_attributes' => 'array',
        'custom_fields' => 'array',
        'text_layout' => 'array',
        'show_product_title' => 'boolean',
        'show_sku' => 'boolean',
        'show_price' => 'boolean',
        'show_variant' => 'boolean',
        'show_qr_code' => 'boolean',
        'show_linear_barcode' => 'boolean',
        'include_checksum' => 'boolean',
        'print_barcode_value' => 'boolean',
        'show_barcode_value' => 'boolean',
        'title_bold' => 'boolean',
        'show_vendor' => 'boolean',
        'show_product_type' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
