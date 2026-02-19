<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use App\Models\Variant;
use App\Models\Product; // Assuming Product model exists and is linked
// Mocking the structure slightly to avoid full DB dependencies if possible, 
// but best to use the actual logic from the Jobs.

class TestSkuGeneration extends Command
{
    protected $signature = 'test:sku-gen {start_number=1} {format=UPC}';
    protected $description = 'Test SKU and Barcode Generation Logic';

    public function handle()
    {
        $this->info("Starting Test...");

        // 1. Test SKU Generation Logic
        $this->info("\n--- UNSCOPED SKU GENERATION TEST ---");
        
        $presets = [
            ['auto_start' => '1', 'prefix' => 'PROD', 'desc' => 'User Input: "1" (Expect PROD-1)'],
            ['auto_start' => '01', 'prefix' => 'PROD', 'desc' => 'User Input: "01" (Expect PROD-01)'],
            ['auto_start' => '0001', 'prefix' => 'PROD', 'desc' => 'User Input: "0001" (Expect PROD-0001)'],
        ];

        foreach ($presets as $s) {
            $this->info("Scenario: {$s['desc']}");
            
            // NEW LOGIC FROM GenerateSkuBatchJob.php (FIXED)
            $start = $s['auto_start'] ?? 1;
            $startStr = (string)$start;
            $padLength = strlen($startStr);
            // $padLength = max(strlen((string)$start), 4); // OLD BUGGY LOGIC
            
            $counter = (int)$start;
            $num = str_pad($counter, $padLength, '0', STR_PAD_LEFT);
            
            $sku = $s['prefix'] . '-' . $num;
            
            $this->line("Input: '{$start}' | Calculated Pad: {$padLength} | Output: {$sku}");
            
            if ($start === '1' && $sku === 'PROD-0001') {
                $this->error("FAIL: User wanted PROD-1 but got PROD-0001");
            } elseif ($start === '1' && $sku === 'PROD-1') {
                $this->info("PASS: PROD-1 generated.");
            }
        }

        // 2. Test Barcode Logic
        $this->info("\n--- UNSCOPED BARCODE GENERATION TEST ---");
        // Logic from GenerateBarcodeBatchJob.php
        $format = $this->argument('format');
        $start = (int)$this->argument('start_number');
        
        $this->info("Testing Format: {$format} from {$start}");
        
        // Mocking rules
        $rules = [
            'format' => $format,
            'prefix' => '',
            'suffix' => '',
            'checksum' => true,
            'numeric_only' => true,
            'auto_fill' => true,
            'enforce_length' => true,
        ];
        
        $counter = $start;
        // Simplified generation for test (copy-paste of critical logic)
        $targetLength = match ($format) {
            'UPC', 'UPCA' => 12,
            'UPCE' => 8,
            'EAN8' => 8,
            'ITF14' => 14,
            default => 13,
        };
        
        // Barcode logic uses fixed padding usually (str_pad($counter, 6, '0'...))
        $base = '' . str_pad($counter, 6, '0', STR_PAD_LEFT) . '';
        $this->line("Base (Pad 6): {$base}");
        
    }
}
