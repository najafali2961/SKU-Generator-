<?php

use App\Http\Controllers\Api\ProductApiController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SkuController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\WebhookController;

Route::middleware(['verify.shopify'])->group(function () {


    Route::get('/', [HomeController::class, 'index'])->name('home');
    Route::get('/products', [ProductController::class, 'index'])->name('products.index');
    Route::get('/products/{id}', [ProductController::class, 'show'])->name('products.show');

    Route::get('/bulk-edit', [ProductController::class, 'bulkEdit'])->name('products.bulk');
    Route::post('/bulk-edit/apply', [ProductController::class, 'bulkEditApply']);
    Route::get('/pro/all', [ProductController::class, 'allIds']);

    Route::get('/sku-generator', [SkuController::class, 'index']);
    Route::post('/sku-generator/preview', [SkuController::class, 'preview']);
    Route::post('/sku-generator/apply', [SkuController::class, 'apply']);
    Route::get('/sku-generator/progress', [SkuController::class, 'progress']);
});


Route::middleware(['auth.webhook'])->group(function () {
    Route::post('/webhook/products-update', [WebhookController::class, 'productsUpdate']);
    Route::post('/webhook/products-delete', [WebhookController::class, 'productsDelete']);
    Route::post('/webhook/products-create', [WebhookController::class, 'productsCreate']); // optional if needed
});

Route::get('logs', [\Rap2hpoutre\LaravelLogViewer\LogViewerController::class, 'index']);
