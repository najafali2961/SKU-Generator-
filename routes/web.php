<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SkuController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\PrinterController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\WebhookController;

// Protected routes - removed check.credits from group
Route::middleware(['verify.shopify', 'billable'])->group(function () {

    Route::get('/', [HomeController::class, 'index'])->name('home');

    // SKU Generator
    Route::get('/sku-generator', [SkuController::class, 'index'])->name('sku-generator');
    Route::post('/sku-generator/preview', [SkuController::class, 'preview']);
    Route::post('/sku-generator/apply', [SkuController::class, 'apply']);
    Route::get('/sku-generator/progress', [SkuController::class, 'progress']);

    // Barcode Printer
    Route::get('/barcode-printer', [PrinterController::class, 'index']);

    // Barcode Generator - ONLY check credits on index page
    Route::get('/barcode-generator', [BarcodeController::class, 'index'])
        ->name('barcode')
        ->middleware('check.credits:barcode_generation');

    Route::post('/barcode-generator/preview', [BarcodeController::class, 'preview']);
    Route::post('/barcode/generate', [BarcodeController::class, 'generate']);
    Route::post('/barcode-generator/apply', [BarcodeController::class, 'apply']);
    Route::get('/barcode-generator/progress', [BarcodeController::class, 'progress']);
    Route::post('/barcode/import', [BarcodeController::class, 'import']);
    Route::post('/barcode/fetch-variants', [BarcodeController::class, 'fetchVariants']);
    Route::post('/barcode/import-preview', [BarcodeController::class, 'importPreview']);
    Route::post('/barcode/import-apply', [BarcodeController::class, 'importApply']);

    Route::get('/barcode-import', [BarcodeController::class, 'importPage'])
        ->name('barcode.import')
        ->middleware('check.credits:barcode_import');

    // Jobs
    Route::get('/jobs', [JobController::class, 'index'])->name('jobs.index');
    Route::get('/jobs/{jobLog}', [JobController::class, 'show'])->name('jobs.show');
    Route::get('/jobs/{jobLog}/progress', [JobController::class, 'progress'])->name('jobs.progress');

    // Printer templates & presets
    Route::prefix('barcode-printer')->name('barcode-printer.')->group(function () {

        Route::get('/', [PrinterController::class, 'index'])->name('index');
        Route::get('/variants', [PrinterController::class, 'variants'])->name('variants');

        // Printer settings
        Route::post('/update-setting/{id}', [PrinterController::class, 'updateSetting'])->name('update-setting');

        // Templates
        Route::post('/save-template', [PrinterController::class, 'saveTemplate'])->name('save-template');
        Route::get('/load-template/{id}', [PrinterController::class, 'loadTemplate'])->name('load-template');
        Route::post('/update-template/{id}', [PrinterController::class, 'updateTemplate'])->name('update-template');
        Route::delete('/delete-template/{id}', [PrinterController::class, 'deleteTemplate'])->name('delete-template');
        Route::post('/set-default-template/{id}', [PrinterController::class, 'setDefaultTemplate'])->name('set-default-template');

        // Printer presets
        Route::get('/load-printer-preset/{id}', [PrinterController::class, 'loadPrinterPreset'])->name('load-printer-preset');

        // PDF
        Route::post('/generate-pdf', [PrinterController::class, 'generatePdf'])->name('generate-pdf');
    });

    // Pricing
    Route::get('/pricing', [PricingController::class, 'index'])->name('pricing');
    Route::post('/pricing/select/{planId}', [PricingController::class, 'selectPlan'])->name('pricing.select');
    Route::post('/pricing/cancel', [PricingController::class, 'cancel'])->name('pricing.cancel');
    Route::get('/billing/{planId}', [PricingController::class, 'showBilling'])->name('billing.show');
    Route::post('/billing/{planId}/create', [PricingController::class, 'createCharge'])->name('billing.create');
    Route::get('/billing/process', [PricingController::class, 'processBilling'])->name('billing.process');
    Route::post('/upgrade-plan', [PricingController::class, 'upgradePlan']);
    Route::get('/credit-stats', [PricingController::class, 'creditStats'])->name('pricing.credit-stats');
});

// Shopify webhooks (protected)
Route::middleware(['auth.webhook'])->group(function () {
    Route::post('/webhook/products-update', [WebhookController::class, 'productsUpdate']);
    Route::post('/webhook/products-delete', [WebhookController::class, 'productsDelete']);
    Route::post('/webhook/products-create', [WebhookController::class, 'productsCreate']);
});

// Log viewer
Route::get('logs', [\Rap2hpoutre\LaravelLogViewer\LogViewerController::class, 'index']);
