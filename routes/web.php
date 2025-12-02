<?php

use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SkuController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\PrinterController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\WebhookController;

Route::middleware(['verify.shopify'])->group(function () {


    Route::get('/', [HomeController::class, 'index'])->name('home');

    Route::get('/sku-generator', [SkuController::class, 'index'])->name('sku-generator');
    Route::post('/sku-generator/preview', [SkuController::class, 'preview']);
    Route::post('/sku-generator/apply', [SkuController::class, 'apply']);
    Route::get('/sku-generator/progress', [SkuController::class, 'progress']);


    Route::get('/barcode-printer', [PrinterController::class, 'index']);

    ///barcode
    Route::get('/barcode-generator', [BarcodeController::class, 'index'])->name('barcode');
    Route::post('/barcode-generator/preview', [BarcodeController::class, 'preview']);
    Route::post('/barcode/generate', [BarcodeController::class, 'generate']);
    Route::post('/barcode-generator/apply', [BarcodeController::class, 'apply']);
    Route::get('/barcode-generator/progress', [BarcodeController::class, 'progress']);
    Route::post('/barcode/import', [BarcodeController::class, 'import']);
    Route::post('/barcode/fetch-variants', [BarcodeController::class, 'fetchVariants']);
    Route::post('/barcode/import-preview', [BarcodeController::class, 'importPreview']);
    Route::post('/barcode/import-apply', [BarcodeController::class, 'importApply']);


    Route::get('/jobs', [JobController::class, 'index'])->name('jobs.index');
    Route::get('/jobs/{jobLog}', [JobController::class, 'show'])->name('jobs.show');
    Route::get('/jobs/{jobLog}/progress', [JobController::class, 'progress'])->name('jobs.progress');
});


Route::middleware(['auth.webhook'])->group(function () {
    Route::post('/webhook/products-update', [WebhookController::class, 'productsUpdate']);
    Route::post('/webhook/products-delete', [WebhookController::class, 'productsDelete']);
    Route::post('/webhook/products-create', [WebhookController::class, 'productsCreate']);
});









Route::get('logs', [\Rap2hpoutre\LaravelLogViewer\LogViewerController::class, 'index']);
