<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class FreeCreditsUpdatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(public int $credits, public ?string $shopName = null)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎁 Your free credits have been updated',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.free-credits-updated',
            with: [
                'credits' => $this->credits,
                'shopName' => $this->shopName,
                'preheader' => 'You now get ' . number_format($this->credits) . ' free credits each month.',
            ],
        );
    }
}
