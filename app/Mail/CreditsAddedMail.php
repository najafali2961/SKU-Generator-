<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CreditsAddedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  string  $type  'giveaway' | 'reset' | 'refill'
     */
    public function __construct(
        public string $type,
        public ?int $amount,
        public int $newBalance,
        public ?string $shopName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->type) {
            'giveaway' => '🎁 You\'ve received bonus credits!',
            'reset' => '🔄 Your monthly credits have refreshed',
            default => '➕ Credits added to your account',
        };

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.credits-added',
            with: [
                'type' => $this->type,
                'amount' => $this->amount,
                'newBalance' => $this->newBalance,
                'shopName' => $this->shopName,
                'preheader' => 'You now have ' . number_format($this->newBalance) . ' credits available.',
            ],
        );
    }
}
