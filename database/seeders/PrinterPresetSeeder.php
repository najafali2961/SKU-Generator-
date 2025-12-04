<?php


namespace Database\Seeders;

use App\Models\PrinterPreset;
use Illuminate\Database\Seeder;

class PrinterPresetSeeder extends Seeder
{
    public function run()
    {
        $presets = [
            [
                'name' => 'Zebra ZD420 - Thermal Direct',
                'brand' => 'Zebra',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 101.6,
                    'paper_height' => 152.4,
                    'paper_orientation' => 'portrait',
                    'margin_top' => 3,
                    'margin_bottom' => 3,
                    'margin_left' => 3,
                    'margin_right' => 3,
                    'label_width' => 95,
                    'label_height' => 50,
                    'labels_per_row' => 1,
                    'labels_per_column' => 3,
                    'label_spacing_horizontal' => 3,
                    'label_spacing_vertical' => 3,
                    'font_size' => 10,
                    'title_font_size' => 12,
                    'barcode_width' => 70,
                    'barcode_height' => 15,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 50.8, 'height' => 25.4, 'name' => '2" × 1"'],
                    ['width' => 76.2, 'height' => 50.8, 'name' => '3" × 2"'],
                    ['width' => 101.6, 'height' => 50.8, 'name' => '4" × 2"'],
                    ['width' => 101.6, 'height' => 152.4, 'name' => '4" × 6" Shipping'],
                ]
            ],
            [
                'name' => 'Dymo LabelWriter 450',
                'brand' => 'Dymo',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 89,
                    'paper_height' => 36,
                    'paper_orientation' => 'landscape',
                    'label_width' => 89,
                    'label_height' => 36,
                    'labels_per_row' => 1,
                    'labels_per_column' => 1,
                    'margin_top' => 0,
                    'margin_bottom' => 0,
                    'margin_left' => 0,
                    'margin_right' => 0,
                    'label_spacing_horizontal' => 0,
                    'label_spacing_vertical' => 0,
                    'font_size' => 9,
                    'title_font_size' => 11,
                    'barcode_width' => 70,
                    'barcode_height' => 12,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 89, 'height' => 28, 'name' => 'Address Label (30252)'],
                    ['width' => 89, 'height' => 36, 'name' => 'Large Address (30256)'],
                    ['width' => 54, 'height' => 25, 'name' => 'Return Address (30330)'],
                ]
            ],
            [
                'name' => 'Brother QL-800',
                'brand' => 'Brother',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 62,
                    'paper_height' => 100,
                    'paper_orientation' => 'portrait',
                    'label_width' => 62,
                    'label_height' => 29,
                    'labels_per_row' => 1,
                    'labels_per_column' => 1,
                    'margin_top' => 0,
                    'margin_bottom' => 0,
                    'margin_left' => 0,
                    'margin_right' => 0,
                    'label_spacing_horizontal' => 0,
                    'label_spacing_vertical' => 0,
                    'font_size' => 9,
                    'title_font_size' => 10,
                    'barcode_width' => 50,
                    'barcode_height' => 12,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 62, 'height' => 29, 'name' => 'Standard Address (DK-11201)'],
                    ['width' => 62, 'height' => 100, 'name' => 'Shipping Label (DK-11202)'],
                    ['width' => 29, 'height' => 90, 'name' => 'File Folder (DK-11203)'],
                ]
            ],
            [
                'name' => 'Standard Laser Printer - A4 (24 labels/sheet)',
                'brand' => 'Generic',
                'type' => 'laser',
                'settings' => [
                    'paper_width' => 210,
                    'paper_height' => 297,
                    'paper_orientation' => 'portrait',
                    'label_width' => 70,
                    'label_height' => 37,
                    'labels_per_row' => 3,
                    'labels_per_column' => 8,
                    'margin_top' => 5,
                    'margin_bottom' => 5,
                    'margin_left' => 5,
                    'margin_right' => 5,
                    'label_spacing_horizontal' => 2.5,
                    'label_spacing_vertical' => 0,
                    'font_size' => 8,
                    'title_font_size' => 10,
                    'barcode_width' => 55,
                    'barcode_height' => 12,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 70, 'height' => 37, 'name' => '24 per sheet (Avery 3474)'],
                    ['width' => 63.5, 'height' => 38.1, 'name' => '21 per sheet (Avery L7160)'],
                    ['width' => 99.1, 'height' => 38.1, 'name' => '14 per sheet (Avery L7163)'],
                ]
            ],
            [
                'name' => 'Standard Laser Printer - Letter (30 labels/sheet)',
                'brand' => 'Generic',
                'type' => 'laser',
                'settings' => [
                    'paper_width' => 215.9,
                    'paper_height' => 279.4,
                    'paper_orientation' => 'portrait',
                    'label_width' => 66.7,
                    'label_height' => 25.4,
                    'labels_per_row' => 3,
                    'labels_per_column' => 10,
                    'margin_top' => 12.7,
                    'margin_bottom' => 12.7,
                    'margin_left' => 5.4,
                    'margin_right' => 5.4,
                    'label_spacing_horizontal' => 3.2,
                    'label_spacing_vertical' => 0,
                    'font_size' => 8,
                    'title_font_size' => 9,
                    'barcode_width' => 50,
                    'barcode_height' => 10,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 66.7, 'height' => 25.4, 'name' => '30 per sheet (Avery 5160)'],
                    ['width' => 101.6, 'height' => 50.8, 'name' => '10 per sheet (Avery 5163)'],
                    ['width' => 99.1, 'height' => 33.9, 'name' => '18 per sheet (Avery 5164)'],
                ]
            ],
            [
                'name' => 'Rollo Label Printer',
                'brand' => 'Rollo',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 101.6,
                    'paper_height' => 152.4,
                    'paper_orientation' => 'portrait',
                    'label_width' => 101.6,
                    'label_height' => 152.4,
                    'labels_per_row' => 1,
                    'labels_per_column' => 1,
                    'margin_top' => 0,
                    'margin_bottom' => 0,
                    'margin_left' => 0,
                    'margin_right' => 0,
                    'label_spacing_horizontal' => 0,
                    'label_spacing_vertical' => 0,
                    'font_size' => 12,
                    'title_font_size' => 14,
                    'barcode_width' => 80,
                    'barcode_height' => 20,
                    'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 101.6, 'height' => 152.4, 'name' => '4" × 6" Shipping'],
                    ['width' => 101.6, 'height' => 101.6, 'name' => '4" × 4" Square'],
                    ['width' => 101.6, 'height' => 50.8, 'name' => '4" × 2" Product'],
                ]
            ],
        ];

        foreach ($presets as $preset) {
            PrinterPreset::create($preset);
        }
    }
}
