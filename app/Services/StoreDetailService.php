<?php

namespace App\Services;

use App\Models\StoreDetail;
use Illuminate\Support\Facades\Log;

/**
 * Pulls fresh shop metadata from the Shopify Admin API and upserts the
 * matching store_details row. Shared by the install flow (AfterAuthenticateJob)
 * and the admin "Sync details" action so the query lives in one place.
 */
class StoreDetailService
{
    /**
     * GraphQL query used to read the core shop record.
     */
    public const SHOP_QUERY = <<<'GRAPHQL'
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

    /**
     * Fetch the shop record from Shopify and update (or create) its StoreDetail.
     *
     * @param  \App\Models\User  $shop  the shop user (Osiset ShopModel)
     * @return \App\Models\StoreDetail|null  the synced row, or null if the API call failed
     */
    public function sync($shop): ?StoreDetail
    {
        try {
            $response = $shop->api()->graph(self::SHOP_QUERY);
        } catch (\Throwable $e) {
            Log::error('[StoreDetailService] sync failed', [
                'shop' => $shop->name ?? 'unknown',
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $status = $response['status'] ?? null;
        $hasErrors = $response['errors'] ?? false;

        if ($status != 200 || $hasErrors) {
            Log::warning('[StoreDetailService] unexpected sync response', [
                'shop' => $shop->name ?? 'unknown',
                'status' => $status,
                'errors' => $hasErrors,
            ]);

            return null;
        }

        // Osiset wraps the GraphQL body under body.data (matches the install
        // flow in FetchProductsOnInstallJob). The old body.container.data path
        // was always null, so every admin "Sync details" reported failure even
        // when Shopify responded fine.
        $data = $response['body']['data']['shop'] ?? null;

        if (! $data) {
            return null;
        }

        return StoreDetail::updateOrCreate(
            ['user_id' => $shop->id],
            [
                'shop_id' => $data['id'] ?? '',
                'shop_name' => $data['name'] ?? '',
                'email' => $data['email'] ?? '',
                'phone' => $data['billingAddress']['phone'] ?? '',
                'description' => $data['description'] ?? '',
                'plan_name' => $data['plan']['displayName'] ?? '',
                'shopify_plus' => $data['plan']['shopifyPlus'] ?? false,
                'shopify_domain' => $data['myshopifyDomain'] ?? '',
                'primary_domain' => $data['primaryDomain']['url'] ?? '',
                'currency' => $data['currencyCode'] ?? '',
                'country' => $data['billingAddress']['country'] ?? '',
            ]
        );
    }
}
