<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Product;
use App\Models\Collection;
use App\Models\LabelTemplate;
use App\Models\BarcodePrinterSetting;
use App\Models\StoreDetail;
use App\Models\Feedback;
use App\Models\JobLog;
use App\Models\CreditUsageLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * GDPR mandatory compliance webhook: shop/redact.
 *
 * Shopify calls this ~48h after a shop uninstalls the app, requiring the app to
 * erase that shop's data. AppUninstalledJob already soft-deletes the shop on
 * uninstall; this is the final purge of any residual store data. Idempotent —
 * safe to run when the shop was already cleaned.
 *
 * This class MUST exist or Osiset's WebhookController fatals with
 * "Class ...Job not found" and returns a 500 to Shopify.
 */
class ShopRedactJob implements ShouldQueue
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
        $domain = (string) $this->shopDomain;

        $shop = User::where('name', $domain)->first();

        if (!$shop) {
            Log::info('[GDPR] shop/redact — no local shop found (already purged)', ['shop' => $domain]);
            return;
        }

        try {
            // Products cascade to variants + barcodes (FK onDelete cascade).
            Product::where('user_id', $shop->id)->delete();
            Collection::where('user_id', $shop->id)->delete();
            LabelTemplate::where('user_id', $shop->id)->delete();
            BarcodePrinterSetting::where('user_id', $shop->id)->delete();
            StoreDetail::where('user_id', $shop->id)->delete();
            Feedback::where('user_id', $shop->id)->delete();
            JobLog::where('user_id', $shop->id)->delete();
            CreditUsageLog::where('user_id', $shop->id)->delete();

            // Per-shop counters (raw tables, keyed by shop_id).
            DB::table('sku_counters')->where('shop_id', $shop->id)->delete();
            DB::table('barcode_counters')->where('shop_id', $shop->id)->delete();

            Log::warning('[GDPR] shop/redact — purged all local data for shop', [
                'shop'    => $domain,
                'shop_id' => $shop->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('[GDPR] shop/redact failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
