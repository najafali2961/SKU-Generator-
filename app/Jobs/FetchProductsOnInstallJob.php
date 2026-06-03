<?php

namespace App\Jobs;

use App\Models\StoreDetail;
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
        $this->shopId = $shop instanceof User ? $shop->id : $shop;
    }

    public function handle(): void
    {
        $shop = User::find($this->shopId);

        if (!$shop) {
            Log::error("Shop not found for ID: {$this->shopId}");
            return;
        }

        // ────────────────────────────────────────────────
        // 1. Fetch and store shop details (was AfterAuthenticateJob)
        // ────────────────────────────────────────────────
        $storeQuery = <<<'GRAPHQL'
        query GetStoreDetails {
            shop {
                id
                name
                email
                description
                plan {
                    displayName
                    shopifyPlus
                }
                myshopifyDomain
                primaryDomain {
                    url
                }
                billingAddress {
                    country
                    phone
                }
                currencyCode
                customerAccountsV2 {
                    url
                }
            }
        }
        GRAPHQL;

        try {
            $storeResponse = $shop->api()->graph($storeQuery);

            if (($storeResponse['status'] ?? 0) === 200 && empty($storeResponse['errors'])) {
                $data = $storeResponse['body']['data']['shop'] ?? [];

                StoreDetail::updateOrCreate(
                    ['user_id' => $shop->id],
                    [
                        'shop_id'        => $data['id']               ?? '',
                        'shop_name'      => $data['name']             ?? '',
                        'email'          => $data['email']            ?? '',
                        'phone'          => $data['billingAddress']['phone']   ?? '',
                        'description'    => $data['description']      ?? '',
                        'plan_name'      => $data['plan']['displayName'] ?? '',
                        'shopify_plus'   => $data['plan']['shopifyPlus'] ?? false,
                        'shopify_domain' => $data['myshopifyDomain']  ?? '',
                        'primary_domain' => $data['primaryDomain']['url'] ?? '',
                        'currency'       => $data['currencyCode']     ?? '',
                        'country'        => $data['billingAddress']['country'] ?? '',
                    ]
                );

                \App\Jobs\CheckShopRestrictedKeywordsJob::dispatch($shop);

                // Welcome the merchant now that we have their store email.
                \App\Services\EmailService::sendWelcome($shop, $data['email'] ?? null);
            } else {
                Log::warning("Failed to fetch store details", [
                    'shop_id'  => $this->shopId,
                    'status'   => $storeResponse['status'] ?? 'unknown',
                    'errors'   => $storeResponse['errors'] ?? null,
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Error fetching store details: " . $e->getMessage(), [
                'shop_id' => $this->shopId,
                'trace'   => $e->getTraceAsString(),
            ]);
            // You can decide: return; or continue to products anyway
        }

        // ────────────────────────────────────────────────
        // 2. Start product pagination + dispatch page jobs
        // ────────────────────────────────────────────────
        $limit = 250;
        $after = null;

        do {
            try {
                $productsQuery = <<<'GRAPHQL'
                query GetProductPageInfo($first: Int!, $after: String) {
                  products(first: $first, after: $after) {
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                  }
                }
                GRAPHQL;

                $response = $shop->api()->graph($productsQuery, [
                    'first' => $limit,
                    'after' => $after,
                ]);

                if (($response['status'] ?? 0) !== 200 || !empty($response['errors'])) {
                    Log::error("Product page query failed", [
                        'shop_id' => $this->shopId,
                        'response' => $response,
                    ]);
                    break;
                }

                $pageInfo = $response['body']['data']['products']['pageInfo'] ?? null;

                // Dispatch job to process this page of 250 products
                FetchProductPageJob::dispatch($shop->id, $after);

                $hasNextPage = $pageInfo['hasNextPage'] ?? false;
                $after = $hasNextPage ? $pageInfo['endCursor'] : null;
            } catch (\Exception $e) {
                Log::error("Failed during product pagination: " . $e->getMessage(), [
                    'shop_id' => $this->shopId,
                    'after'   => $after,
                ]);
                break; // Stop loop on critical failure
            }

            // Be nice to Shopify API rate limits
            usleep(200_000); // 0.2 seconds

        } while ($hasNextPage ?? false);
    }
}