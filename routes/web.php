<?php

use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\PrinterController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\SkuController;
use App\Http\Controllers\SyncController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Support giveaway routes (no auth: support agents open them directly via
// URL from chat). Claim is one-shot per store with the amount from the
// giveaway_credits setting; custom grants work with a plain URL, and only
// require ?key=... if a Support grant key is set in Credit Settings.
Route::get('/support/giveaway/{domain}', [HomeController::class, 'supportAddCredits']);
Route::get('/support/giveaway/{domain}/{credits}', [HomeController::class, 'supportGiveCredits']);

Route::middleware(['verify.shopify', 'billable'])->group(function () {
    Route::get('/', [HomeController::class, 'index'])->name('home');

    // SKU Generator
    Route::get('/sku-generator', [SkuController::class, 'index'])
        ->middleware('check.credits:sku_generation')
        ->name('sku-generator');
    Route::post('/sku-generator/preview', [SkuController::class, 'preview']);
    Route::post('/sku-generator/export', [SkuController::class, 'export']);
    Route::get('/sku-generator/download-export', [SkuController::class, 'downloadExport'])->name('sku-generator.download-export');
    Route::post('/sku-generator/apply', [SkuController::class, 'apply']);

    // Barcode Printer page lives in the barcode-printer prefix group below
    // (registering it twice would override the credit check).

    // Barcode Generator
    Route::get('/barcode-generator', [BarcodeController::class, 'index'])
        ->middleware('check.credits:barcode_generation')
        ->name('barcode');

    Route::post('/barcode-generator/preview', [BarcodeController::class, 'preview']);
    Route::post('/barcode-generator/apply', [BarcodeController::class, 'apply']);
    Route::post('/barcode-generator/export', [BarcodeController::class, 'export']);
    Route::get('/barcode-generator/download-export', [BarcodeController::class, 'downloadExport'])->name('barcode-generator.download-export');
    Route::post('/barcode/import-preview', [BarcodeController::class, 'importPreview']);
    Route::post('/barcode/import-apply', [BarcodeController::class, 'importApply']);

    Route::get('/barcode-import', [BarcodeController::class, 'importPage'])
        ->middleware('check.credits:barcode_import')
        ->name('barcode.import');

    // Jobs
    Route::get('/jobs', [JobController::class, 'index'])->name('jobs.index');
    Route::get('/history', [JobController::class, 'index'])->name('history');
    Route::get('/jobs/{jobLog}', [JobController::class, 'show'])->name('jobs.show');
    Route::get('/jobs/{jobLog}/progress', [JobController::class, 'progress'])->name('jobs.progress');

    // Printer templates & presets
    Route::prefix('barcode-printer')->name('barcode-printer.')->group(function () {
        Route::get('/', [PrinterController::class, 'index'])
            ->middleware('check.credits:label_printing')
            ->name('index');
        Route::get('/variants', [PrinterController::class, 'variants'])->name('variants');

        // Printer settings
        Route::post('/update-setting/{id}', [PrinterController::class, 'updateSetting'])->name('update-setting');

        // Templates
        Route::post('/save-template', [PrinterController::class, 'saveTemplate'])->name('save-template');
        Route::post('/load-template/{id}', [PrinterController::class, 'loadTemplate'])->name('load-template');
        Route::post('/update-template/{id}', [PrinterController::class, 'updateTemplate'])->name('update-template');
        Route::delete('/delete-template/{id}', [PrinterController::class, 'deleteTemplate'])->name('delete-template');
        Route::post('/set-default-template/{id}', [PrinterController::class, 'setDefaultTemplate'])->name('set-default-template');

        // Printer presets
        Route::get('/load-printer-preset/{id}', [PrinterController::class, 'loadPrinterPreset'])->name('load-printer-preset');

        // PDF
        Route::post('/generate-pdf', [PrinterController::class, 'generatePdf'])->name('generate-pdf');
        Route::post('/generate-pdf-job', [PrinterController::class, 'generatePdfJob'])->name('generate-pdf-job');
    });

    // Pricing
    Route::get('/pricing', [PricingController::class, 'index'])->name('pricing');
    Route::post('/pricing/select/custom', [PricingController::class, 'selectCustomPlan'])->name('pricing.select.custom');
    Route::post('/pricing/select/{planId}', [PricingController::class, 'selectPlan'])->name('pricing.select');
    Route::post('/pricing/cancel', [PricingController::class, 'cancel'])->name('pricing.cancel');
    Route::get('/credit-stats', [PricingController::class, 'creditStats'])->name('pricing.credit-stats');

    // Feedback
    Route::post('/feedback', [FeedbackController::class, 'store'])->name('feedback.store');

    // Manual product re-sync (recover from missed webhooks / cleanup orphans)
    Route::post('/sync/products', [SyncController::class, 'start'])->name('sync.products');
    Route::get('/sync/status', [SyncController::class, 'status'])->name('sync.status');
});

// Shopify webhooks (protected)
Route::middleware(['auth.webhook'])->group(function () {
    Route::post('/webhook/products-update', [WebhookController::class, 'productsUpdate']);
    Route::post('/webhook/products-delete', [WebhookController::class, 'productsDelete']);
    Route::post('/webhook/products-create', [WebhookController::class, 'productsCreate']);
});

// Log viewer (admin only — logs may contain access tokens, shop domains, customer data)
Route::middleware(['auth:admin'])->group(function () {
    Route::get('logs', [\Rap2hpoutre\LaravelLogViewer\LogViewerController::class, 'index']);
});
