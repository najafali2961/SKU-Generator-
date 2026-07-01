<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * GDPR mandatory compliance webhook: customers/data_request.
 *
 * Shopify calls this when a shopper asks a merchant for the personal data an
 * installed app holds about them. Airo SKU & Barcode stores only product,
 * variant and barcode data — no customer PII — so there is nothing to return.
 * We acknowledge and log the request for the audit trail.
 *
 * This class MUST exist: Osiset's WebhookController resolves the handler by
 * convention (\App\Jobs\CustomersDataRequestJob) and fatals with
 * "Class ...Job not found" — returning a 500 to Shopify — when it is missing.
 */
class CustomersDataRequestJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var string Shop's myshopify domain (x-shopify-shop-domain header). */
    public $shopDomain;

    /** @var object JSON-decoded webhook payload. */
    public $data;

    public function __construct($shopDomain, $data)
    {
        $this->shopDomain = $shopDomain;
        $this->data = $data;
        $this->onQueue('webhooks');
    }

    public function handle(): void
    {
        Log::info('[GDPR] customers/data_request received — app stores no customer PII, nothing to return', [
            'shop'        => (string) $this->shopDomain,
            'customer_id' => data_get($this->data, 'customer.id'),
        ]);
    }
}
