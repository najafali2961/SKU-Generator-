<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchProductsOnInstallJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $shopId;

    public function __construct($shop)
    {
        $this->shopId = $shop->id ?? $shop;
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);
        if (!$shop) {
            Log::error("Shop not found: {$this->shopId}");
            return;
        }

        $limit = 250;
        $after = null;

        do {
            try {
                $response = $shop->api()->graph(
                    <<<'GRAPHQL'
                    query ($first: Int!, $after: String) {
                      products(first: $first, after: $after) {
                        pageInfo {
                          hasNextPage
                          endCursor
                        }
                      }
                    }
                    GRAPHQL,
                    ['first' => $limit, 'after' => $after]
                );

                $pageInfo = $response['body']['data']['products']['pageInfo'] ?? null;

                // Dispatch ONE job for this entire page (250 products)
                FetchProductPageJob::dispatch($shop->id, $after);

                $hasNextPage = $pageInfo['hasNextPage'] ?? false;
                $after = $hasNextPage ? $pageInfo['endCursor'] : null;
            } catch (\Exception $e) {
                Log::error("Failed to dispatch page job: " . $e->getMessage());
                break; // Stop dispatching if API fails
            }

            // Small delay to be gentle on Shopify
            usleep(200_000); // 0.2 sec

        } while ($hasNextPage);

        Log::info("Successfully dispatched all product page jobs for {$shop->myshopify_domain}");
    }
}
