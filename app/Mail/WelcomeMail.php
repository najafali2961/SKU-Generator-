<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class WelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(public ?string $shopName = null)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome to ' . config('app.name') . ' 🎉',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome',
            with: [
                'shopName' => $this->shopName,
                'preheader' => 'Your barcode & SKU toolkit is ready — start generating in seconds.',
            ],
        );
    }
}
