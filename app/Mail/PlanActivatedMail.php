<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class PlanActivatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(
        public string $planName,
        public ?int $credits = null,
        public bool $unlimited = false,
        public ?string $shopName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🚀 Your ' . $this->planName . ' plan is active',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.plan-activated',
            with: [
                'planName' => $this->planName,
                'credits' => $this->credits,
                'unlimited' => $this->unlimited,
                'shopName' => $this->shopName,
                'preheader' => 'Your ' . $this->planName . ' plan is now active — enjoy your new credits.',
            ],
        );
    }
}
