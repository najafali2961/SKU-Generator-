<?php

namespace App\Services;

use App\Models\Deployment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Throwable;

/**
 * Detects the git commit currently checked out on the server and records a row
 * in the `deployments` table the first time it sees a new one. Safe to call on
 * every request — a cache guard makes the common "nothing changed" path cheap
 * (a couple of small file reads, no process spawn, no DB query).
 */
class DeploymentRecorder
{
    private const CACHE_KEY = 'deployment:last_commit';

    /**
     * Record the live commit if it differs from the last one we logged.
     * Returns the new Deployment, or null when there was nothing new to record.
     */
    public function recordIfChanged(string $source = 'auto'): ?Deployment
    {
        try {
            $commit = $this->currentCommit();

            if (! $commit) {
                return null;
            }

            // Fast path: we already recorded this exact commit.
            if (Cache::get(self::CACHE_KEY) === $commit) {
                return null;
            }

            // Stop two concurrent requests/workers from logging the same deploy twice.
            $lock = Cache::lock('deployment:record', 10);

            if (! $lock->get()) {
                return null;
            }

            try {
                // Re-check against the DB in case the cache was flushed (e.g. cache:clear).
                $latest = Deployment::query()->latest('deployed_at')->first();

                if ($latest && $latest->commit_hash === $commit) {
                    Cache::forever(self::CACHE_KEY, $commit);

                    return null;
                }

                $deployment = Deployment::create($this->gather($commit, $source));

                Cache::forever(self::CACHE_KEY, $commit);

                return $deployment;
            } finally {
                $lock->release();
            }
        } catch (Throwable $e) {
            // Logging a deployment must never break a request or the deploy itself.
            report($e);

            return null;
        }
    }

    /**
     * The commit hash currently checked out. Reads .git directly (no process) on
     * the hot path and only falls back to the git CLI for unusual layouts.
     */
    private function currentCommit(): ?string
    {
        $gitDir = base_path('.git');

        // Worktrees/submodules store .git as a file pointing elsewhere — let git resolve it.
        if (is_file($gitDir)) {
            return $this->commitViaCli();
        }

        $head = @file_get_contents($gitDir.'/HEAD');

        if ($head === false) {
            return $this->commitViaCli();
        }

        $head = trim($head);

        // Detached HEAD: the hash sits in HEAD directly.
        if (preg_match('/^[0-9a-f]{40}$/i', $head)) {
            return $head;
        }

        // "ref: refs/heads/main"
        if (str_starts_with($head, 'ref:')) {
            $ref = trim(substr($head, 4));
            $refFile = $gitDir.'/'.$ref;

            if (is_file($refFile)) {
                $hash = trim((string) @file_get_contents($refFile));

                if ($hash !== '') {
                    return $hash;
                }
            }

            // Loose ref missing — look in packed-refs.
            $packed = @file_get_contents($gitDir.'/packed-refs');

            if ($packed !== false) {
                foreach (explode("\n", $packed) as $line) {
                    if ($line === '' || $line[0] === '#' || $line[0] === '^') {
                        continue;
                    }

                    [$hash, $name] = array_pad(explode(' ', $line, 2), 2, null);

                    if (trim((string) $name) === $ref) {
                        return trim((string) $hash);
                    }
                }
            }
        }

        return $this->commitViaCli();
    }

    private function commitViaCli(): ?string
    {
        $result = Process::path(base_path())->run('git rev-parse HEAD');

        if (! $result->successful()) {
            return null;
        }

        return trim($result->output()) ?: null;
    }

    /**
     * Pull the author, message, date and branch for a commit via the git CLI.
     * Any field that can't be read is simply left null.
     *
     * @return array<string, mixed>
     */
    private function gather(string $commit, string $source): array
    {
        $subject = null;
        $author = null;
        $committedAt = null;
        $branch = null;

        // %x1f = unit separator, a byte that won't appear in a commit message.
        $log = Process::path(base_path())
            ->run('git log -1 --pretty=format:%an%x1f%cI%x1f%s '.escapeshellarg($commit));

        if ($log->successful()) {
            [$author, $committedAt, $subject] = array_pad(
                explode("\x1f", trim($log->output()), 3),
                3,
                null
            );
        }

        $branchResult = Process::path(base_path())->run('git rev-parse --abbrev-ref HEAD');

        if ($branchResult->successful()) {
            $branch = trim($branchResult->output()) ?: null;

            if ($branch === 'HEAD') {
                $branch = null; // detached
            }
        }

        return [
            'commit_hash' => $commit,
            'commit_short' => substr($commit, 0, 12),
            'commit_subject' => $subject ?: null,
            'commit_author' => $author ?: null,
            'branch' => $branch,
            'committed_at' => $committedAt ? Carbon::parse($committedAt) : null,
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'source' => $source,
            'deployed_at' => now(),
        ];
    }
}
