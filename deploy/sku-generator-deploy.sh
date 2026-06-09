#!/bin/bash
# Paste this into aaPanel -> WebHook -> (this app's hook) -> Edit.
# Octane runs on port 8000. The deploy stops Octane and Supervisor relaunches it
# with the new code. REQUIRED: laravel/octane must be in composer.json +
# composer.lock and committed, or the `composer install` below removes it and
# octane:start fails. (Same pattern as automations:8002 / editor:8001.)
echo "Starting deployment..."

APP_DIR=/www/wwwroot/sku.airoapps.com
DEPLOY_KEY=/root/.ssh/sku_generator         # this app's own deploy key (unique per repo)
BRANCH=main                                 # branch you deploy from

cd "$APP_DIR" || { echo "FATAL: cannot cd to $APP_DIR"; exit 1; }

# 1. Temp HOME for Git & Composer
export HOME=/tmp
export COMPOSER_HOME=/tmp
export COMPOSER_ALLOW_SUPERUSER=1

# HOME=/tmp hides /root/.ssh, so pin the deploy key explicitly
export GIT_SSH_COMMAND="ssh -i $DEPLOY_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

# 2. Mark repo safe (system+global+local) & clear any stale git lock
git config --system --add safe.directory "$APP_DIR"
git config --global --add safe.directory "$APP_DIR"
git config --local  --add safe.directory "$APP_DIR"
rm -f .git/index.lock

# 3. Unlock aaPanel immutable .user.ini so git can overwrite
for f in .user.ini public/.user.ini; do
    [ -f "$f" ] && chattr -i "$f" 2>/dev/null || true
done

# 4. Pull latest code (abort if fetch fails so we never build stale code)
git fetch origin || { echo "FATAL: git fetch failed (check deploy key)"; exit 1; }
git reset --hard origin/$BRANCH
git checkout -B $BRANCH origin/$BRANCH
echo "Now at: $(git log --oneline -1)"

# 5. Re-lock .user.ini
for f in .user.ini public/.user.ini; do
    [ -f "$f" ] && chattr +i "$f" 2>/dev/null || true
done

# 6. Dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# 7. Laravel caches + migrations (auto-runs new migrations)
php artisan migrate --force
php artisan config:cache
php artisan route:cache

# 8. Reload queue workers so new code is live
php artisan queue:restart

# 8a. Log this deploy into the admin "Deploy Log" (System → Deploy Log).
# Records the now-live commit (hash, message, author, time). Safe/no-op if the
# commit was already logged. Never fails the deploy.
php artisan deploy:record --source=webhook || true

# 8b. Octane reset on port 8000 (Supervisor relaunches octane:start after the kill)
echo "Clearing Octane workers on port 8000..."
php artisan octane:stop || true
if lsof -t -i:8000 > /dev/null; then
    echo "Port 8000 still busy! Forcing termination..."
    kill -9 $(lsof -t -i:8000)
    sleep 2
fi

# 9. Fix ownership (skip locked .user.ini)
find "$APP_DIR" -name ".user.ini" -prune -o -exec chown www:www {} +

echo "Deployment complete!"
