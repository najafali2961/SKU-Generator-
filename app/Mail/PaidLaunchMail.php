<?php

namespace App\Mail;

use App\Mail\Concerns\HasAppUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * One-time paid-launch announcement: the app now has paid plans; the store
 * stays on the Free plan automatically with renewing free credits.
 */
class PaidLaunchMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    /**
     * @param array<int, array{name: string, credits: string, price: string}> $plans
     */
    public function __construct(
        public int $freeCredits,
        public array $plans = [],
        public ?string $shopName = null,
        public int $skuCost = 1,
        public int $labelCost = 2,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: config('app.name') . ': pricing has launched — your store stays on the Free plan',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.paid-launch',
            with: [
                'freeCredits' => $this->freeCredits,
                'plans' => $this->plans,
                'shopName' => $this->shopName,
                'skuCost' => $this->skuCost,
                'labelCost' => $this->labelCost,
                'preheader' => 'Our free beta has ended — here is exactly what changes for your store, and what stays free.',
            ],
        );
    }
}
