<?php

namespace App\Jobs;

use App\Services\ShopifyService;
use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BulkEditProducts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $shopId;
    protected $productIds;
    protected $field;
    protected $value;

    public function __construct($shopId, array $productIds, string $field, $value)
    {
        $this->shopId = $shopId;
        $this->productIds = $productIds;
        $this->field = $field;
        $this->value = $value;
    }

    public function handle()
    {
        $shop = \App\Models\User::find($this->shopId);
        $shopifyService = new ShopifyService($shop);

        $products = Product::whereIn('id', $this->productIds)->get();
        $total = count($products);
        $done = 0;

        foreach ($products as $product) {
            $data = [];

            switch ($this->field) {
                case 'title':
                    $data['title'] = $this->value;
                    break;
                case 'description':
                    $data['description_html'] = $this->value;
                    break;
                case 'vendor':
                    $data['vendor'] = $this->value;
                    break;
                case 'product_type':
                    $data['product_type'] = $this->value;
                    break;
                case 'tags':
                    $data['tags'] = array_map('trim', explode(',', $this->value));
                    break;
                case 'status':
                    $data['status'] = strtoupper($this->value);
                    break;
            }

            // Update Local DB
            $product->update($data);

            // Update Shopify store
            try {
                $shopifyService->updateProduct($product->shopify_id, $data);
            } catch (\Exception $e) {
                Log::error("Shopify update failed for {$product->shopify_id}: {$e->getMessage()}");
            }

            $done++;
            if ($done % 20 === 0 || $done == $total) { // log every 20 products

            }
        }
    }
}
