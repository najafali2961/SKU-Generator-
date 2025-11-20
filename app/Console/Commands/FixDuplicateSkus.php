<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixDuplicateSkus extends Command
{
    protected $signature = 'sku:fix-duplicates';
    protected $description = 'Find and fix duplicate SKUs in variants table';

    public function handle()
    {
        $duplicates = DB::table('variants')
            ->select('sku', DB::raw('COUNT(*) as count'))
            ->groupBy('sku')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isEmpty()) {
            $this->info("No duplicate SKUs found. You're good!");
            return Command::SUCCESS;
        }

        $this->warn("Duplicate SKUs found:");
        foreach ($duplicates as $dup) {
            $this->warn("SKU: {$dup->sku} — Count: {$dup->count}");
        }

        $this->warn("\nFixing duplicates now...");

        foreach ($duplicates as $dup) {
            // Fetch all rows with this SKU
            $rows = DB::table('variants')
                ->where('sku', $dup->sku)
                ->orderBy('id')
                ->get();

            $first = true;
            $counter = 1;

            foreach ($rows as $row) {
                if ($first) {
                    // Keep the first one unchanged
                    $first = false;
                    continue;
                }

                // Generate new unique SKU
                $newSku = $dup->sku . '-' . $counter++;
                $this->info("Fixing row #{$row->id} -> {$newSku}");

                DB::table('variants')
                    ->where('id', $row->id)
                    ->update(['sku' => $newSku]);
            }
        }

        $this->info("\nAll duplicate SKUs fixed.");

        return Command::SUCCESS;
    }
}
