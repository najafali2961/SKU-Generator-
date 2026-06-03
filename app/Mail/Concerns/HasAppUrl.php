<?php

namespace App\Mail\Concerns;

/**
 * Adds a merchant-specific "open the app" URL to a Mailable.
 *
 * The property is public, so Laravel automatically exposes it to the
 * email view as $appUrl (falling back to config('app.url') when null).
 * EmailService sets this to the merchant's Shopify admin deep link so
 * buttons open the embedded app in the right store instead of hitting
 * the bare /authenticate route.
 */
trait HasAppUrl
{
    public ?string $appUrl = null;
}
