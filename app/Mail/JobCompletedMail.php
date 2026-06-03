<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Mail\Concerns\HasAppUrl;

class JobCompletedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, HasAppUrl;

    public function __construct(
        public string $jobTitle,
        public ?int $total = null,
        public int $processed = 0,
        public int $failed = 0,
        public ?string $shopName = null,
        public ?string $downloadUrl = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '✅ ' . $this->jobTitle . ' is complete',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.job-completed',
            with: [
                'jobTitle' => $this->jobTitle,
                'total' => $this->total,
                'processed' => $this->processed,
                'failed' => $this->failed,
                'shopName' => $this->shopName,
                'downloadUrl' => $this->downloadUrl,
                'preheader' => $this->jobTitle . ' finished — ' . number_format($this->processed) . ' item(s) processed.',
            ],
        );
    }
}
