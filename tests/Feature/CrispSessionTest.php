<?php

namespace Tests\Feature;

use App\Models\StoreDetail;
use App\Models\User;
use App\Support\CrispSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The Crisp widget showed support "visitor276444". It now names the visitor
 * after the store and carries the plan, dev-store flag and credit balance.
 *
 * The giveaway deep links are load-bearing for support macros — the shape of
 * those URLs is pinned here.
 */
class CrispSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function makeShop(array $attributes = []): User
    {
        $id = uniqid();

        return User::create(array_merge([
            'name' => "test-shop-{$id}.myshopify.com",
            'email' => "shop-{$id}@example.com",
            'password' => 'secret-token',
            'shopify_freemium' => false,
            'plan_id' => null,
            'credits' => 500,
            'credits_used' => 120,
        ], $attributes));
    }

    protected function makeDetail(User $shop, array $attributes = []): StoreDetail
    {
        return StoreDetail::create(array_merge([
            'user_id' => $shop->id,
            'shop_name' => 'Acme Supplies',
            'email' => 'owner@acme.com',
            'plan_name' => 'Basic',
            'shopify_domain' => 'acme-supplies.myshopify.com',
            'primary_domain' => 'https://acme.com/',
            'country' => 'US',
            'currency' => 'USD',
        ], $attributes));
    }

    private function value(array $crisp, string $key): ?string
    {
        foreach ($crisp['data'] as [$k, $v]) {
            if ($k === $key) {
                return $v;
            }
        }

        return null;
    }

    public function test_it_names_the_visitor_after_the_store(): void
    {
        $shop = $this->makeShop();
        $this->makeDetail($shop);

        $crisp = CrispSession::for($shop->fresh());

        $this->assertSame('acme.com', $crisp['nickname']);
        $this->assertSame('acme.com', $this->value($crisp, 'store_domain'));
        $this->assertSame('acme-supplies.myshopify.com', $this->value($crisp, 'myshopify_domain'));
        $this->assertSame('Basic', $this->value($crisp, 'shopify_plan'));
    }

    public function test_it_falls_back_to_the_myshopify_domain_when_details_never_synced(): void
    {
        $shop = $this->makeShop(['name' => 'unsynced.myshopify.com']);

        $crisp = CrispSession::for($shop);

        $this->assertSame('unsynced.myshopify.com', $crisp['nickname']);
        $this->assertNull($this->value($crisp, 'shopify_plan'));
    }

    public function test_it_reports_the_credit_balance(): void
    {
        $shop = $this->makeShop(['credits' => 500, 'credits_used' => 120]);
        $this->makeDetail($shop);

        $crisp = CrispSession::for($shop->fresh());

        $this->assertSame('120 used / 500 allocated (380 left)', $this->value($crisp, 'credits'));
        $this->assertNotContains('out-of-credits', $crisp['segments']);
    }

    public function test_it_segments_a_shop_that_has_run_out_of_credits(): void
    {
        $shop = $this->makeShop(['credits' => 500, 'credits_used' => 500]);
        $this->makeDetail($shop);

        $crisp = CrispSession::for($shop->fresh());

        // The usual cause of "generation stopped working".
        $this->assertSame('500 used / 500 allocated (0 left)', $this->value($crisp, 'credits'));
        $this->assertContains('out-of-credits', $crisp['segments']);
    }

    public function test_it_keeps_the_support_giveaway_links_exactly_as_they_were(): void
    {
        $shop = $this->makeShop();
        $this->makeDetail($shop, ['primary_domain' => 'https://acme.com']);

        $crisp = CrispSession::for($shop->fresh());

        // HomeController::resolveShopByDomain looks the shop up by this string;
        // support macros depend on the path shape.
        $this->assertSame(url('/support/giveaway/acme.com'), $this->value($crisp, 'giveaway_link'));
        $this->assertSame(url('/support/giveaway/acme.com/100'), $this->value($crisp, 'custom_credits'));
    }

    public function test_the_giveaway_link_falls_back_to_the_myshopify_domain(): void
    {
        // A shop whose store details never synced still has to be resolvable, or
        // the giveaway route 404s.
        $shop = $this->makeShop(['name' => 'unsynced.myshopify.com']);

        $crisp = CrispSession::for($shop);

        $this->assertSame(url('/support/giveaway/unsynced.myshopify.com'), $this->value($crisp, 'giveaway_link'));
    }

    public function test_it_flags_a_development_store(): void
    {
        $shop = $this->makeShop();
        $this->makeDetail($shop, ['partner_development' => true]);

        $crisp = CrispSession::for($shop->fresh());

        $this->assertSame('yes', $this->value($crisp, 'dev_store'));
        $this->assertContains('dev-store', $crisp['segments']);
    }

    public function test_every_value_is_a_string_as_the_crisp_api_requires(): void
    {
        $shop = $this->makeShop();
        $this->makeDetail($shop);

        foreach (CrispSession::for($shop->fresh())['data'] as $pair) {
            $this->assertCount(2, $pair);
            $this->assertIsString($pair[0]);
            $this->assertIsString($pair[1]);
        }
    }

    public function test_it_returns_nothing_when_nobody_is_logged_in(): void
    {
        $this->assertNull(CrispSession::for(null));
    }
}
