<?php

namespace App\Jobs;

use App\Mail\AppUninstalledForRestrictedKeywordMail;
use App\Models\RestrictedKeyword;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Models\Plan;

class CheckShopRestrictedKeywordsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $shop;

    public function __construct(User $shop)
    {
        $this->shop = $shop;
    }

    public function handle(): void
    {
        try {
            // Load keywords
            $keywords = RestrictedKeyword::pluck('keyword')->toArray();
            
            if (empty($keywords)) {
                return;
            }

            $storeDetail = $this->shop->storeDetails;
            
            // Build searchable string from shop and storedetail
            $searchableText = implode(' | ', array_filter([
                $this->shop->name,
                $this->shop->email,
                $storeDetail?->shop_name,
                $storeDetail?->email,
                $storeDetail?->phone,
                $storeDetail?->description,
                $storeDetail?->shopify_domain,
                $storeDetail?->primary_domain,
            ]));

            $matchedKeyword = null;

            foreach ($keywords as $keyword) {
                if (stripos($searchableText, $keyword) !== false) {
                    $matchedKeyword = $keyword;
                    break;
                }
            }

            if ($matchedKeyword) {
                Log::warning("Restricted keyword matched for shop {$this->shop->name}. Initiating uninstall.", [
                    'matched_keyword' => $matchedKeyword,
                ]);

                // Call Shopify appUninstall mutation
                $mutation = '
                    mutation {
                        appUninstall {
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                ';
                
                $response = $this->shop->api()->graph($mutation);
                $errors = data_get($response, 'body.container.data.appUninstall.userErrors', data_get($response, 'body.data.appUninstall.userErrors', []));
                
                if (!empty($errors)) {
                    Log::error("Failed to uninstall shop via API due to restricted keyword: " . ($errors[0]['message'] ?? 'Unknown error'));
                }

                // Call local uninstall job to mark deleted
                dispatch(new AppUninstalledJob($this->shop->name, json_decode('{}')));

                // Send Email to admin
                $adminEmail = config('mail.from.address') ?? 'info@airoapps.com';
                Mail::to($adminEmail)->send(new AppUninstalledForRestrictedKeywordMail($this->shop, $storeDetail, $matchedKeyword));
            }
        } catch (\Exception $e) {
            Log::error("Error in CheckShopRestrictedKeywordsJob: " . $e->getMessage(), [
                'shop' => $this->shop->name,
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
