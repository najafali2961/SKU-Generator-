<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppUninstalledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public ?string $shopName = null)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Sorry to see you go — ' . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.uninstall',
            with: [
                'shopName' => $this->shopName,
                'preheader' => 'You can reinstall anytime and pick up right where you left off.',
            ],
        );
    }
}
