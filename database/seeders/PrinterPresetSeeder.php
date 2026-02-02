<?php


namespace Database\Seeders;

use App\Models\PrinterPreset;
use Illuminate\Database\Seeder;

class PrinterPresetSeeder extends Seeder
{
    public function run()
    {
        $presets = [
            
            // --- THERMAL PRINTERS (ROLL) ---

            // ZEBRA
            [
                'name' => 'Zebra ZD220 / ZD230',
                'brand' => 'Zebra',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 101.6, 'paper_height' => 152.4, 'paper_orientation' => 'portrait',
                    'label_width' => 101.6, 'label_height' => 152.4,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 3, // Gap sensing
                    'font_size' => 12, 'title_font_size' => 14,
                    'barcode_width' => 80, 'barcode_height' => 20, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 101.6, 'height' => 152.4, 'name' => '4" × 6" Shipping'],
                    ['width' => 101.6, 'height' => 101.6, 'name' => '4" × 4" Square'],
                    ['width' => 50.8, 'height' => 25.4, 'name' => '2" × 1" Asset Tag'],
                ]
            ],
            [
                'name' => 'Zebra ZD420 / ZD620',
                'brand' => 'Zebra',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 101.6, 'paper_height' => 152.4, 'paper_orientation' => 'portrait',
                    'label_width' => 101.6, 'label_height' => 152.4,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 0,
                    'font_size' => 12, 'title_font_size' => 14,
                    'barcode_width' => 80, 'barcode_height' => 25, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 101.6, 'height' => 152.4, 'name' => '4" × 6" Shipping'],
                    ['width' => 101.6, 'height' => 76.2, 'name' => '4" × 3" Shipping'],
                ]
            ],

            // DYMO
            [
                'name' => 'Dymo LabelWriter 450 / 550',
                'brand' => 'Dymo',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 89, 'paper_height' => 36, 'paper_orientation' => 'landscape',
                    'label_width' => 89, 'label_height' => 36,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 0,
                    'font_size' => 10, 'title_font_size' => 12,
                    'barcode_width' => 70, 'barcode_height' => 12, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 89, 'height' => 28, 'name' => 'Address (30252)'],
                    ['width' => 89, 'height' => 36, 'name' => 'Large Address (30256)'],
                    ['width' => 54, 'height' => 25, 'name' => 'Miltipurpose (30333)'],
                    ['width' => 104, 'height' => 159, 'name' => '4XL Shipping (1744907)'],
                ]
            ],

            // ROLLO
            [
                'name' => 'Rollo (USB / Wireless)',
                'brand' => 'Rollo',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 101.6, 'paper_height' => 152.4, 'paper_orientation' => 'portrait',
                    'label_width' => 101.6, 'label_height' => 152.4,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 0,
                    'font_size' => 14, 'title_font_size' => 16,
                    'barcode_width' => 90, 'barcode_height' => 25, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 101.6, 'height' => 152.4, 'name' => '4" × 6" Shipping'],
                    ['width' => 57, 'height' => 32, 'name' => '2.25" × 1.25" Barcode'],
                ]
            ],

            // BROTHER
            [
                'name' => 'Brother QL-700 / QL-800 Series',
                'brand' => 'Brother',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 62, 'paper_height' => 29, 'paper_orientation' => 'landscape',
                    'label_width' => 62, 'label_height' => 29,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 0,
                    'font_size' => 9, 'title_font_size' => 11,
                    'barcode_width' => 50, 'barcode_height' => 10, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 62, 'height' => 29, 'name' => 'Address (DK-11201)'],
                    ['width' => 62, 'height' => 100, 'name' => 'Shipping (DK-11202)'],
                    ['width' => 38, 'height' => 90, 'name' => 'Address (DK-11208)'],
                    ['width' => 29, 'height' => 90, 'name' => 'Address (DK-11203)'],
                ]
            ],
            [
                'name' => 'Brother QL-1110NWB (Wide Format)',
                'brand' => 'Brother',
                'type' => 'thermal',
                'settings' => [
                    'paper_width' => 103, 'paper_height' => 164, 'paper_orientation' => 'portrait',
                    'label_width' => 103, 'label_height' => 164,
                    'labels_per_row' => 1, 'labels_per_column' => 1,
                    'margin_top' => 0, 'margin_bottom' => 0, 'margin_left' => 0, 'margin_right' => 0,
                    'label_spacing_horizontal' => 0, 'label_spacing_vertical' => 0,
                    'font_size' => 14, 'title_font_size' => 16,
                    'barcode_width' => 90, 'barcode_height' => 30, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 103, 'height' => 164, 'name' => '4" × 6" Shipping (DK-1247)'],
                    ['width' => 102, 'height' => 51, 'name' => '4" × 2" (DK-1240)'],
                ]
            ],


            // --- SHEET PRINTERS (LASER/INKJET) ---

            [
                'name' => 'Sheet Printer (A4 Page)',
                'brand' => 'Generic',
                'type' => 'sheet',
                'settings' => [
                    'paper_width' => 210, 'paper_height' => 297, 'paper_orientation' => 'portrait',
                    'label_width' => 63.5, 'label_height' => 38.1,
                    'labels_per_row' => 3, 'labels_per_column' => 7,
                    'margin_top' => 15.1, 'margin_bottom' => 15.1, 'margin_left' => 7.2, 'margin_right' => 7.2,
                    'label_spacing_horizontal' => 2.5, 'label_spacing_vertical' => 0,
                    'font_size' => 8, 'title_font_size' => 9,
                    'barcode_width' => 50, 'barcode_height' => 12, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 63.5, 'height' => 38.1, 'name' => '21 per sheet (Avery L7160)'],
                    ['width' => 70, 'height' => 37, 'name' => '24 per sheet (Avery 3474)'],
                    ['width' => 99.1, 'height' => 38.1, 'name' => '14 per sheet (Avery L7163)'],
                    ['width' => 99.1, 'height' => 34, 'name' => '16 per sheet (Avery L7162)'],
                    ['width' => 48.5, 'height' => 25.4, 'name' => '40 per sheet (Avery L7651)'],
                    ['width' => 38.1, 'height' => 21.2, 'name' => '65 per sheet (Avery L7651)'],
                ]
            ],
            [
                'name' => 'Sheet Printer (Letter Page)',
                'brand' => 'Generic',
                'type' => 'sheet',
                'settings' => [
                    'paper_width' => 215.9, 'paper_height' => 279.4, 'paper_orientation' => 'portrait',
                    'label_width' => 66.7, 'label_height' => 25.4,
                    'labels_per_row' => 3, 'labels_per_column' => 10,
                    'margin_top' => 12.7, 'margin_bottom' => 12.7, 'margin_left' => 5.4, 'margin_right' => 5.4,
                    'label_spacing_horizontal' => 3.2, 'label_spacing_vertical' => 0,
                    'font_size' => 8, 'title_font_size' => 9,
                    'barcode_width' => 50, 'barcode_height' => 10, 'barcode_type' => 'code128',
                ],
                'supported_label_sizes' => [
                    ['width' => 66.7, 'height' => 25.4, 'name' => '30 per sheet (Avery 5160)'],
                    ['width' => 101.6, 'height' => 50.8, 'name' => '10 per sheet (Avery 5163)'],
                    ['width' => 99.1, 'height' => 33.9, 'name' => '18 per sheet (Avery 5164)'],
                    ['width' => 101.6, 'height' => 84.7, 'name' => '6 per sheet (Avery 5164)'],
                ]
            ],
        ];

        foreach ($presets as $preset) {
            PrinterPreset::create($preset);
        }
    }
}
