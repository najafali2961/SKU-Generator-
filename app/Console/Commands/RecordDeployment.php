<?php

namespace App\Console\Commands;

use App\Services\DeploymentRecorder;
use Illuminate\Console\Command;

class RecordDeployment extends Command
{
    protected $signature = 'deploy:record {--source=webhook : Where this record came from (webhook|manual|auto)}';

    protected $description = 'Record the currently checked-out git commit into the deployment log';

    public function handle(DeploymentRecorder $recorder): int
    {
        $deployment = $recorder->recordIfChanged($this->option('source'));

        if ($deployment) {
            $this->info("Recorded deployment {$deployment->commit_short} on {$deployment->branch} — {$deployment->commit_subject}");
        } else {
            $this->line('No new commit to record — deployment log is already up to date.');
        }

        return self::SUCCESS;
    }
}
