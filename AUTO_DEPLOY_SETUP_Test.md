# Auto-Deploy: GitHub → aaPanel (Laravel) — Complete Setup Guide

> Reference document. It's safe to delete or move this file out of the repo — it
> is not used by the app. Goal: `git push origin main` → your server updates
> itself (pull → build → migrate → reload), with **zero manual steps**.

This guide is a battle-tested template. Every step below exists because it broke
in real life and this is the fix. Follow it top to bottom for any new project.

---

## How it works (the chain)

```
You:        git push origin main
              │
GitHub:     Actions workflow fires (.github/workflows/deploy.yml)
              │  curl POST → your webhook URL (stored as a GitHub Secret)
              ▼
aaPanel:    WebHook plugin receives the POST and runs a bash deploy script
              │  git pull → composer → npm build → migrate → restart workers
              ▼
Server:     app is now running the new code
```

Four things must be set up, **in this order**:
1. An **SSH deploy key** so the server can pull a private repo from GitHub.
2. The **GitHub Actions workflow** (`deploy.yml`) that pings the webhook on push.
3. A **GitHub Secret** holding the webhook URL.
4. The **aaPanel WebHook** + its **deploy script** that does the actual work.

---

## Placeholders used below

Replace these with your project's values (example values from a real project shown):

| Placeholder | Example | Where to find it |
|---|---|---|
| `<APP_DIR>` | `/www/wwwroot/myapp.com` | aaPanel → the site's root directory |
| `<SERVER_IP>` | `143.198.3.70` | your droplet/VPS public IP |
| `<PANEL_PORT>` | `21518` | the port in your aaPanel URL (`http://IP:PORT/...`) |
| `<OWNER>/<REPO>` | `najaf299/Airo-Bulk-Editor` | your GitHub repo |
| `<BRANCH>` | `main` | the branch you deploy from |
| `<ACCESS_KEY>` | `ceOJQ...SLq` | aaPanel → WebHook → View key |

---

## Part 1 — SSH deploy key (server ↔ GitHub)

Needed so the server can `git pull` a **private** repo. Run these **on the server**
(aaPanel → Terminal, as `root`):

```bash
# 1. Generate a key (press Enter at every prompt — no passphrase)
ssh-keygen -t ed25519 -C "aaPanel-deploy-key" -f /root/.ssh/id_ed25519 -N ""

# 2. Print the PUBLIC key — copy the whole line
cat /root/.ssh/id_ed25519.pub
```

Then on **GitHub**: repo → **Settings → Deploy keys → Add deploy key**
- Title: `aaPanel`
- Key: paste the public key from step 2
- Leave **"Allow write access" unchecked** (pull-only is all you need)

Back **on the server**, point the repo at the SSH remote and verify:

```bash
cd <APP_DIR>
git remote set-url origin git@github.com:<OWNER>/<REPO>.git
ssh -T git@github.com        # type "yes" if asked; expect: "Hi <OWNER>/<REPO>! You've successfully authenticated"
```

> ⚠️ **Gotcha:** the deploy script sets `HOME=/tmp` (for Composer), which makes
> SSH look for the key in `/tmp/.ssh` instead of `/root/.ssh`. The script handles
> this with `GIT_SSH_COMMAND` (see Part 4). Don't skip that line or every pull
> fails with `Permission denied (publickey)`.

---

## Part 2 — GitHub Actions workflow

Create **`.github/workflows/deploy.yml`** in the repo:

```yaml
name: Deploy to aaPanel

on:
  push:
    branches: [ main ]   # change if you deploy from a different branch
  workflow_dispatch: {}  # adds a manual "Run workflow" button in the Actions tab

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Webhook Pull
        run: |
          # -f  : fail the run on a real HTTP error (4xx/5xx)
          # -s  : silent, -S: still show errors
          # -L  : FOLLOW the panel's http->https 302 redirect (critical — see gotchas)
          # -k  : accept the panel's self-signed cert on a bare IP
          curl -fsSL -k -X POST \
            --connect-timeout 15 --retry 2 --retry-delay 5 \
            "${{ secrets.AAPANEL_WEBHOOK_URL }}"
```

Commit and push it. **`-L` and `-k` are the two flags everyone forgets** — without
`-L`, the Action goes green but never actually deploys (see Troubleshooting).

---

## Part 3 — GitHub Secret (the webhook URL)

1. In aaPanel: **App Store → WebHook** plugin (install it if missing) → **Add** a
   hook (e.g. named `git_auto_pull`). It generates an **access_key**.
2. Click **View key** and copy the key.
3. Build the URL — note it must be **`https`** and use the panel port:
   ```
   https://<SERVER_IP>:<PANEL_PORT>/hook?access_key=<ACCESS_KEY>
   ```
4. On GitHub: repo → **Settings → Secrets and variables → Actions → New repository
   secret**
   - Name: `AAPANEL_WEBHOOK_URL`
   - Value: the URL from step 3

> ⚠️ Use **`https://`**, not `http://`. The panel redirects http→https, and that
> redirect is the #1 cause of "green but didn't deploy." (`-L` in the workflow is
> a backup, but the secret should still be https.)

---

## Part 4 — aaPanel WebHook deploy script

In aaPanel → **WebHook → `git_auto_pull` → Edit**, paste this script. **This is the
final, fixed version** — every line marked `# FIX` is something that silently broke
before:

```bash
#!/bin/bash
echo "Starting deployment..."

APP_DIR=<APP_DIR>
cd "$APP_DIR" || { echo "FATAL: cannot cd to $APP_DIR"; exit 1; }

# 1. Temp HOME for Git & Composer (avoids root-home permission issues)
export HOME=/tmp
export COMPOSER_HOME=/tmp
export COMPOSER_ALLOW_SUPERUSER=1

# FIX: HOME=/tmp makes SSH miss /root/.ssh — pin the deploy key explicitly,
#      or every git fetch fails with "Permission denied (publickey)".
export GIT_SSH_COMMAND="ssh -i /root/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

# 2. Mark repo as safe & clear any stale git lock from a crashed run
git config --global --add safe.directory "$APP_DIR"
rm -f .git/index.lock

# 3. Unlock aaPanel's immutable .user.ini files so git can overwrite them
for f in .user.ini public/.user.ini; do
    [ -f "$f" ] && chattr -i "$f" 2>/dev/null || true
done

# 4. Pull latest code.
# FIX: abort if fetch fails (so we never silently build STALE code), and
#      force onto the deploy branch (fixes a stray-branch checkout).
git fetch origin || { echo "FATAL: git fetch failed (check deploy key)"; exit 1; }
git reset --hard origin/<BRANCH>
git checkout -B <BRANCH> origin/<BRANCH>
echo "Now at: $(git log --oneline -1)"

# 5. Re-lock .user.ini
for f in .user.ini public/.user.ini; do
    [ -f "$f" ] && chattr +i "$f" 2>/dev/null || true
done

# 6. Dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# 7. Laravel caches + migrations (auto-runs new migrations!)
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# 8. FIX: reload long-lived workers so the new code is actually LIVE.
#     Without this, queued jobs & Octane keep the OLD code in memory.
php artisan queue:restart                        # queue workers reload on next job
php artisan octane:reload 2>/dev/null || true    # reload Octane web workers
# If octane:reload says "not running", restart the app's program once in
# aaPanel → Supervisor → Restart (Octane is usually Supervisor-managed).

# 9. Fix file ownership (skip the locked .user.ini files)
find "$APP_DIR" -name ".user.ini" -prune -o -exec chown www:www {} +

echo "Deployment complete!"
```

Save it.

---

## Part 5 — Verify it works

1. **Trigger:** push any change to `<BRANCH>`, or hit **Actions → Deploy to aaPanel
   → Run workflow**.
2. **GitHub Actions:** the run should be ✅ green.
3. **Proof it really ran** (green alone is not proof) — aaPanel → **WebHook →
   `git_auto_pull` → Log**: you should see a **fresh** execution with
   `Now at: <latest commit>` and `Deployment complete!`.
4. **On the server:**
   ```bash
   cd <APP_DIR> && git log --oneline -1     # should be your latest commit
   ```
5. **End-to-end test:** add a file (`echo test > DEPLOY_TEST.txt`), commit, push —
   it should appear on the server within a minute. Then `git rm` it, push — it
   should disappear. Adds *and* deletes propagating = fully automated.

---

## Part 6 — Running multiple apps on one server (multi-repo, multi-account)

Once you host more than one app on the same panel, the natural question is *"how
does the webhook know which repo an update came from?"* — and the answer is the
thing that makes the whole design simple:

> **The receiver does NOT detect the repo. The `access_key` in the URL is the
> router.** Each repo's `deploy.yml` calls a *different* webhook URL, and each URL
> is bound to a *different* deploy script. Nothing ever inspects the push payload.

So every app is a fully independent pipeline that happens to share one server:

```
repo A push → A's deploy.yml → URL ?access_key=AAA → script A (editor dir, port 8001, key id_ed25519)
repo B push → B's deploy.yml → URL ?access_key=BBB → script B (automations dir, port 8002, key airo_automations)
```

### What is unique per app vs shared

| Per app — MUST be unique | Shared across all apps |
|---|---|
| `<APP_DIR>` (the site folder) | The server + its IP |
| **Deploy key** (its own keypair) | aaPanel panel port (`<PANEL_PORT>`) |
| `GIT_SSH_COMMAND -i /root/.ssh/<that key>` | The WebHook *plugin* (one plugin, many hooks) |
| aaPanel WebHook `access_key` → unique URL | |
| GitHub Secret `AAPANEL_WEBHOOK_URL` (each repo holds its own) | |
| Octane port + Supervisor program | |

### The two real apps on this server

| App | `<APP_DIR>` | Deploy key (`/root/.ssh/…`) | Octane port |
|---|---|---|---|
| **editor** (`najaf299/Airo-Bulk-Editor`) | `/www/wwwroot/editor.airoapps.com` | `id_ed25519` | 8001 |
| **automations** (`…/Airo-Automations`) | `/www/wwwroot/automations.airoapps.com` | `airo_automations` | 8002 |

The only differences between their two deploy scripts are exactly the four
"unique" rows above — `APP_DIR`, the `-i` key in `GIT_SSH_COMMAND`, the Octane
port, and (in aaPanel) the `access_key` that triggers each one.

> **Note — Octane handling in the live scripts:** these two scripts use
> `php artisan octane:stop` followed by a force-kill of anything left on the port
> (`kill -9 $(lsof -t -i:<port>)`), instead of the `octane:reload` shown in Part 4.
> Both work; the stop+kill form is the more aggressive "guarantee a clean restart"
> variant. **Whichever you use, the port MUST be unique per app** — two apps on the
> same port means each deploy silently kills the other.

### The deploy-key rule (why there are two different keys)

**A GitHub deploy key is per-repo.** The *same* public key cannot be added as a
deploy key to a second repo — GitHub rejects it with *"Key already in use."* That
is precisely why `automations` uses `airo_automations` instead of reusing
`id_ed25519` (the `id_ed25519` `.pub` is already registered on `Airo-Bulk-Editor`).

**Rule: one keypair per repo.** To add the next app:

```bash
# one key per app — name the file after the app
ssh-keygen -t ed25519 -C "deploy-<app>" -f /root/.ssh/<app> -N ""
cat /root/.ssh/<app>.pub          # paste into that repo's Settings → Deploy keys
```

…then point that app's script at it: `GIT_SSH_COMMAND="ssh -i /root/.ssh/<app> …"`.

### Mixing GitHub accounts (3 repos from account A + 2 from account B)

**The server does not care which account owns a repo.** Deploy keys attach at the
**repo** level — GitHub matches the key to its one repo and grants pull access to
that repo only; the owning account is invisible to the server. So splitting repos
across two accounts is **mechanically identical** to having them all under one
account. There is no extra step for the cross-account ones — for *each* repo,
regardless of account, you do the same four things:

1. generate its keypair on the server,
2. add its `.pub` to **that repo's** Deploy keys (logged into whichever account owns it),
3. create its aaPanel WebHook (own `access_key`) + deploy script,
4. set its `AAPANEL_WEBHOOK_URL` secret in **that repo**.

The accounts never interact. (Account ownership *would* matter only if you
authenticated with one shared user token / SSH identity instead of per-repo
deploy keys — which is exactly the trap this per-repo-key design avoids.)

### Per-app worksheet (copy one row per new app)

| App | Repo (account) | `<APP_DIR>` | Deploy key | Octane port | WebHook hook name |
|---|---|---|---|---|---|
| editor | `najaf299/Airo-Bulk-Editor` (A) | `/www/wwwroot/editor.airoapps.com` | `id_ed25519` | 8001 | `git_auto_pull` (editor) |
| automations | `…/Airo-Automations` (?) | `/www/wwwroot/automations.airoapps.com` | `airo_automations` | 8002 | `git_auto_pull` (automations) |
| app3 | `…/…` | `/www/wwwroot/…` | `app3` | 8003 | `deploy_app3` |
| app4 | `…/…` | `/www/wwwroot/…` | `app4` | 8004 | `deploy_app4` |
| app5 | `…/…` | `/www/wwwroot/…` | `app5` | 8005 | `deploy_app5` |

For each new app, repeat Parts 1–4 with that row's values. Nothing in the chain is
shared except the panel itself.

---

## Troubleshooting — every failure we hit and its fix

| Symptom | Real cause | Fix |
|---|---|---|
| Action fails: `curl: (28) connection timed out` | Wrong/old server IP in the secret, or server down/firewalled | Correct the IP in `AAPANEL_WEBHOOK_URL`. On a droplet, IPs can change — pin a **Reserved/Floating IP**. |
| **Action GREEN but nothing deploys** | Panel 302-redirects `http→https`; `curl` without `-L` treats the redirect as success | Use `curl -fsSL -k`, and make the secret `https://…`. **Most common gotcha.** |
| Webhook Log: `Permission denied (publickey)` | `HOME=/tmp` hides the key at `/root/.ssh` | Add `export GIT_SSH_COMMAND="ssh -i /root/.ssh/id_ed25519 …"` (Part 4) |
| Deploy runs but server stuck on an old commit | `git fetch` failing silently → resets to a stale ref | Abort-on-fetch-fail (Part 4, step 4); confirm with `git log -1 origin/<BRANCH>` |
| Server on a weird branch (e.g. `looping`) | A past manual git op left a stray checkout | `git checkout -B <BRANCH> origin/<BRANCH>` in the script (Part 4) |
| **Deploy succeeds but new code isn't live** | Queue/Octane workers cache PHP code in memory | `php artisan queue:restart` + `octane:reload` (Part 4, step 8); or restart the program in aaPanel → Supervisor |
| `curl: (60) SSL certificate problem` | Self-signed cert on a bare IP | `curl -k` in the workflow |
| Vite build warns/fails | Node too old | Install Node 20+ on the server (`nvm` or aaPanel Node manager) |
| `git` can't overwrite `.user.ini` | aaPanel sets it immutable (`chattr +i`) | `chattr -i` before pull, `chattr +i` after (Part 4, steps 3 & 5) |
| `migrate` shows "Nothing to migrate" when you expected changes | New migration files didn't actually pull | It's the silent-fetch issue above — fix the pull first |
| GitHub: **"Key already in use"** when adding a deploy key | A deploy key is per-repo; that `.pub` is already on another repo | Generate a *new* keypair for this repo (Part 6) and point its script's `GIT_SSH_COMMAND` at it |
| Two apps fight: one deploy kills the other's workers | Both apps share the same Octane port | Give every app a **unique** port (8001, 8002, …) in its script (Part 6) |
| Wrong app updated / nothing updated on a push | Repo's `AAPANEL_WEBHOOK_URL` secret holds another app's `access_key` | Each repo's secret must point to *its own* hook's `access_key` (Part 6 — the key is the router) |

### Mental model
- **Green Action = the webhook POST returned 2xx.** That's all. It does **not**
  mean the server-side script ran or succeeded.
- **Truth lives in the aaPanel WebHook → Log**, not in GitHub Actions.
- **On disk ≠ live.** Migrations apply immediately, but PHP code in long-lived
  workers (queue, Octane) needs a worker restart.

---

## Reuse checklist (for the next project)

- [ ] Repo has `.github/workflows/deploy.yml` (Part 2) with `-fsSL -k`
- [ ] Server has `/root/.ssh/id_ed25519`; its `.pub` is a GitHub **Deploy key** (Part 1)
- [ ] Server remote is `git@github.com:<OWNER>/<REPO>.git` and `ssh -T git@github.com` works
- [ ] aaPanel WebHook created; deploy script pasted (Part 4) with `<APP_DIR>`/`<BRANCH>` filled in
- [ ] GitHub Secret `AAPANEL_WEBHOOK_URL` = `https://<SERVER_IP>:<PANEL_PORT>/hook?access_key=<ACCESS_KEY>`
- [ ] Verified with the add/delete file test (Part 5)
- [ ] Node 20+ on the server if the project uses Vite
- [ ] **Multi-app (Part 6):** this app has its **own** deploy key, **own** Octane port, **own** WebHook `access_key`, and its secret points to *its* hook — no value reused from another app

Once all boxes are checked, every `git push origin <BRANCH>` deploys automatically.
```

> **Heads-up:** push-to-`<BRANCH>` becomes a **live production deploy with
> auto-running migrations** — there is no manual approval gate. Keep
> not-ready work on feature branches / PRs.
