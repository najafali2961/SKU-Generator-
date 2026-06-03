<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class JobFailedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(
        public string $jobTitle,
        public int $processed = 0,
        public int $failed = 0,
        public ?string $error = null,
        public ?string $shopName = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠️ ' . $this->jobTitle . ' needs your attention',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.job-failed',
            with: [
                'jobTitle' => $this->jobTitle,
                'processed' => $this->processed,
                'failed' => $this->failed,
                'error' => $this->error,
                'shopName' => $this->shopName,
                'preheader' => $this->jobTitle . ' stopped before finishing — open the app to retry.',
            ],
        );
    }
}
