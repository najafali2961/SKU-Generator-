<?php

namespace App\Jobs;

use App\Models\StoreDetail;
use App\Services\EmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Services\Modules\SharedService;

class AfterAuthenticateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $shop;

    /**
     * Create a new job instance.
     */
    public function __construct($shop)
    {
        $this->shop = $shop;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $query = "query GetStoreDetails {
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
                            customerAccountsV2{
                                url
                            }
                        }
                    }";

        $response = $this->shop->api()->graph($query);
        if ($response['status'] == 200 && $response['errors'] == false) {
            $data = $response['body']['container']['data']['shop'];
            $storeDetails = StoreDetail::updateOrCreate(
                ['user_id' => $this->shop->id],
                [
                    'shop_id' => $data['id'] ?? "",
                    'shop_name' => $data['name'] ?? "",
                    'email' => $data['email'] ?? "",
                    'phone' => $data['billingAddress']['phone'] ?? "",
                    'description' => $data['description'] ?? "",
                    'plan_name' => $data['plan']['displayName'] ?? "",
                    'shopify_plus' => $data['plan']['shopifyPlus'] ?? "",
                    'shopify_domain' => $data['myshopifyDomain'] ?? "",
                    'primary_domain' => $data['primaryDomain']['url'] ?? "",
                    'currency' => $data['currencyCode'] ?? "",
                    'country' => $data['billingAddress']['country'] ?? "",
            
                ]
            );

          
        }
    }
}