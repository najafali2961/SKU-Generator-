<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Jobs\ProductsUpdateJob;
use App\Jobs\ProductsDeleteJob;
use App\Jobs\ProductsCreateJob;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function productsUpdate(Request $request)
    {
        try {
            $data = json_decode($request->getContent(), false); // Keep as object

            ProductsUpdateJob::dispatch(
                $request->header('X-Shopify-Shop-Domain'),
                $data
            );

            return response()->json(['status' => 'ok'], 201);
        } catch (\Throwable $e) {
            Log::error("Error handling PRODUCTS_UPDATE", [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['status' => 'error'], 500);
        }
    }

    public function productsDelete(Request $request)
    {
        try {
            $data = json_decode($request->getContent(), false);

            ProductsDeleteJob::dispatch(
                $request->header('X-Shopify-Shop-Domain'),
                $data
            );

            return response()->json(['status' => 'ok'], 201);
        } catch (\Throwable $e) {
            Log::error("Error handling PRODUCTS_DELETE", [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['status' => 'error'], 500);
        }
    }

    public function productsCreate(Request $request)
    {
        try {
            $data = json_decode($request->getContent(), false);

            ProductsCreateJob::dispatch(
                $request->header('X-Shopify-Shop-Domain'),
                $data
            );

            return response()->json(['status' => 'ok'], 201);
        } catch (\Throwable $e) {
            Log::error("Error handling PRODUCTS_CREATE", [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['status' => 'error'], 500);
        }
    }
}
