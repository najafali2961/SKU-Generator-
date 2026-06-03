<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TrialStartedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $planName,
        public int $trialDays,
        public ?string $trialEndsAt = null,
        public ?string $shopName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎈 Your ' . $this->trialDays . '-day free trial has started',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.trial-started',
            with: [
                'planName' => $this->planName,
                'trialDays' => $this->trialDays,
                'trialEndsAt' => $this->trialEndsAt,
                'shopName' => $this->shopName,
                'preheader' => 'Enjoy ' . $this->trialDays . ' days of ' . $this->planName . ' on us — no charge until it ends.',
            ],
        );
    }
}
