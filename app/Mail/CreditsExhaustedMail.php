<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class CreditsExhaustedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(
        public int $creditsTotal,
        public int $creditsUsed,
        public ?string $shopName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🪫 You\'ve run out of credits',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.credits-exhausted',
            with: [
                'creditsTotal' => $this->creditsTotal,
                'creditsUsed' => $this->creditsUsed,
                'shopName' => $this->shopName,
                'preheader' => 'Your credits are used up — upgrade or wait for your next cycle to continue.',
            ],
        );
    }
}
