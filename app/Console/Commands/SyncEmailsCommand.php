<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncEmailsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-emails';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch new emails via IMAP and store them in the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting IMAP email sync...');

        try {
            $client = \Webklex\IMAP\Facades\Client::account('default');
            $client->connect();

            // Select the INBOX folder
            $folder = $client->getFolder('INBOX');

            // Fetch unseen emails
            $messages = $folder->query()->unseen()->get();
            $this->info("Found " . $messages->count() . " new emails.");

            foreach ($messages as $message) {
                $uid = $message->getUid();

                // Check if we already synced this email
                if (\App\Models\SupportEmail::where('imap_uid', $uid)->exists()) {
                    continue; // Skip if already exists
                }

                // Extract sender info
                $from = $message->getFrom()[0];
                $fromEmail = $from->mail;
                $fromName = $from->personal ?? null;

                // Create the record
                \App\Models\SupportEmail::create([
                    'imap_uid' => $uid,
                    'from_email' => $fromEmail,
                    'from_name' => $fromName,
                    'subject' => $message->getSubject(),
                    'body_text' => $message->getTextBody(),
                    'body_html' => $message->getHTMLBody(),
                    'date' => $message->getDate(),
                    'is_read' => false,
                ]);

                // Optional: mark as read on the remote server
                $message->setFlag('Seen');
                
                $this->info("Synced email from {$fromEmail}");
            }

        } catch (\Exception $e) {
            $this->error("Failed to sync emails: " . $e->getMessage());
        }

        $this->info('IMAP email sync completed.');
    }
}
