<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * GDPR mandatory compliance webhook: customers/redact.
 *
 * Shopify calls this (48h after a shopper requests deletion) to have installed
 * apps erase that customer's personal data. Airo SKU & Barcode stores only
 * product/variant/barcode data — no customer PII — so there is nothing to
 * redact. We acknowledge and log for the audit trail.
 *
 * This class MUST exist or Osiset's WebhookController fatals with
 * "Class ...Job not found" and returns a 500 to Shopify.
 */
class CustomersRedactJob implements ShouldQueue
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
        Log::info('[GDPR] customers/redact received — app stores no customer PII, nothing to redact', [
            'shop'        => (string) $this->shopDomain,
            'customer_id' => data_get($this->data, 'customer.id'),
        ]);
    }
}
