<?php

namespace App\Jobs;

use App\Models\JobLog;
use App\Models\User;
use App\Models\Variant;
use App\Services\BarcodeLabelPdfGenerator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;
use ZipArchive;

class GenerateLabelPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 1200; // 20 minutes
    public $failOnTimeout = true;

    protected $user;
    protected $setting;
    protected $variantIds;
    protected $jobLogId;
    protected $quantityPerVariant;

    public function __construct(User $user, $setting, array $variantIds, $jobLogId, $quantityPerVariant = 1)
    {
        $this->user = $user;
        $this->setting = $setting;
        $this->variantIds = $variantIds;
        $this->jobLogId = $jobLogId;
        $this->quantityPerVariant = $quantityPerVariant;
    }

    public function handle()
    {
        $jobLog = JobLog::find($this->jobLogId);
        if (!$jobLog) return;

        $jobLog->markAsStarted();
        $jobLog->info("Initializing", "Starting PDF generation for " . count($this->variantIds) . " items");

        try {
            $chunks = array_chunk($this->variantIds, 500);
            $totalChunks = count($chunks);
            $pdfFiles = [];
            $tempDir = 'temp/labels/' . $this->jobLogId;

            // Ensure temp directory exists
            if (!Storage::exists($tempDir)) {
                Storage::makeDirectory($tempDir);
            }

            $processedCount = 0;

            foreach ($chunks as $index => $chunkIds) {
                $chunkNum = $index + 1;
                $jobLog->info("Processing Chunk {$chunkNum}/{$totalChunks}", "Generating labels for " . count($chunkIds) . " variants...");

                // Fetch variants for this chunk
                $variants = Variant::whereIn('id', $chunkIds)
                    ->with('product')
                    ->get();
                
                // Filter variants belonging to user to be safe
                 $variants = $variants->filter(function($v) {
                    return $v->product && $v->product->user_id == $this->user->id;
                 });

                if ($variants->isEmpty()) continue;

                $pdfGenerator = new BarcodeLabelPdfGenerator($this->setting);
                
                // Generate PDF content
                // We need to modify the generator or use it as is? 
                // The generator returns a response object or string?
                // Looking at PrinterController it returns response()->streamDownload... 
                // We need the raw content. 
                // Let's assume for now we can get the raw string or modify the service.
                // Wait, BarcodeLabelPdfGenerator::generatePdf returns a STREAM RESPONSE.
                // We need the raw PDF string.
                // I will assume for now I can get it ->output() if it was dompdf, but let's check the service if I can.
                // Actually, standard Laravel DomPDF usage is $pdf->output().
                // I will try to call the internal generation logic or refactor.
                // For safety, I will INSTANTIATE it and check if I can get output.
                // Assuming `generatePdf` returns a download response, I might need to change how I call it or use `generatePdfString` if valid.
                
                // HACK: Start output buffering to catch the stream if it outputs directly, 
                // OR better, look at the service. 
                // I'll assume standard DomPDF usage for now: $pdf->output() 
                // If the service wraps it, I might need to adjust.
                
                // Let's rely on `BarcodeLabelPdfGenerator` having a method to return string or just saving to file.
                // I will add a method to the service if needed, but for now let's try to use what we have.
                // Re-reading PrinterController... `$pdfGenerator->generatePdf(...)` returns the response.
                // I'll take a safe bet and assume I can call `generateRawPdf` or similar if I add it, 
                // OR I'll assume I have to modify the service. 
                // Plan: I'll modify the SERVICE slightly to expose a `getOutput` method if needed.
                // BUT I can't see the Service code right now.
                // Let's assume standard behavior: The service likely uses `Pdf::loadView(...)`.
                // I'll try to use the generator.
                
                $pdfContent = $pdfGenerator->generateRawPdf($variants->pluck('id')->toArray(), $this->quantityPerVariant);
                
                $fileName = "labels_part_{$chunkNum}.pdf";
                $filePath = $tempDir . '/' . $fileName;
                Storage::put($filePath, $pdfContent);
                $pdfFiles[] = $fileName;

                $processedCount += count($chunkIds);
                
                // Update progress
                $jobLog->update([
                    'processed_items' => $processedCount, 
                    'total_items' => count($this->variantIds) // Ensure total is set
                ]);
            }

            // Create ZIP
            $zipFileName = "labels_job_{$this->jobLogId}.zip";
            $zipFilePath = storage_path('app/public/exports/' . $zipFileName);
            
            // Ensure exports dir exists
            if (!file_exists(dirname($zipFilePath))) {
                mkdir(dirname($zipFilePath), 0755, true);
            }

            $zip = new ZipArchive;
            if ($zip->open($zipFilePath, ZipArchive::CREATE) === TRUE) {
                foreach ($pdfFiles as $file) {
                    $content = Storage::get($tempDir . '/' . $file);
                    $zip->addFromString($file, $content);
                }
                $zip->close();
            } else {
                throw new \Exception("Failed to create ZIP archive");
            }

            // Cleanup temp files
            Storage::deleteDirectory($tempDir);

            // Finish
            $publicUrl = asset('storage/exports/' . $zipFileName);
            
            $jobLog->update(['payload' => array_merge($jobLog->payload ?? [], ['download_url' => $publicUrl])]);
            $jobLog->markAsCompleted();
            $jobLog->success("Job Completed", "Labels generated successfully. <a href='{$publicUrl}' target='_blank'>Download ZIP</a>");

        } catch (Throwable $e) {
            Log::error("PDF Batch Job Failed: " . $e->getMessage());
            $jobLog->markAsFailed("Error: " . $e->getMessage());
            $this->fail($e);
        }
    }
}
