<?php

use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\BarcodeController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SkuController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\PrinterController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\WebhookController;

Route::middleware(['verify.shopify'])->group(function () {


    Route::get('/', [HomeController::class, 'index'])->name('home');

    Route::get('/sku-generator', [SkuController::class, 'index']);
    Route::post('/sku-generator/preview', [SkuController::class, 'preview']);
    Route::post('/sku-generator/apply', [SkuController::class, 'apply']);
    Route::get('/sku-generator/progress', [SkuController::class, 'progress']);


    Route::get('/barcode-printer', [PrinterController::class, 'index']);

    ///barcode
    Route::get('/barcode-generator', [BarcodeController::class, 'index'])->name('barcode.index');
    Route::post('/barcode/generate', [BarcodeController::class, 'generate'])->name('barcode.generate');
});


Route::middleware(['auth.webhook'])->group(function () {
    Route::post('/webhook/products-update', [WebhookController::class, 'productsUpdate']);
    Route::post('/webhook/products-delete', [WebhookController::class, 'productsDelete']);
    Route::post('/webhook/products-create', [WebhookController::class, 'productsCreate']);
});

Route::get('logs', [\Rap2hpoutre\LaravelLogViewer\LogViewerController::class, 'index']);
