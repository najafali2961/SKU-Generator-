#!/bin/bash
# Reusable helper — run ON THE SERVER (aaPanel Terminal as root) to onboard ANY new app.
# It: generates that app's deploy key, prints the public key, and writes a ready
# deploy script you can paste into aaPanel's WebHook.
#
# Usage:
#   ./add-app.sh <app-name> <app-dir> [branch]
# Example:
#   ./add-app.sh sku_generator /www/wwwroot/sku.airoapps.com main

set -e

APP_NAME="$1"
APP_DIR="$2"
BRANCH="${3:-main}"

if [ -z "$APP_NAME" ] || [ -z "$APP_DIR" ]; then
  echo "Usage: ./add-app.sh <app-name> <app-dir> [branch]"
  exit 1
fi

KEY="/root/.ssh/$APP_NAME"
SCRIPT="/root/deploy-$APP_NAME.sh"

# 1. One keypair per repo (GitHub rejects a reused deploy key with "Key already in use")
if [ -f "$KEY" ]; then
  echo ">> Key $KEY already exists, reusing it."
else
  ssh-keygen -t ed25519 -C "deploy-$APP_NAME" -f "$KEY" -N ""
fi

# 2. Write the per-app deploy script (no Octane variant)
cat > "$SCRIPT" <<EOF
#!/bin/bash
echo "Starting deployment..."
APP_DIR=$APP_DIR
DEPLOY_KEY=$KEY
BRANCH=$BRANCH

cd "\$APP_DIR" || { echo "FATAL: cannot cd to \$APP_DIR"; exit 1; }
export HOME=/tmp
export COMPOSER_HOME=/tmp
export COMPOSER_ALLOW_SUPERUSER=1
export GIT_SSH_COMMAND="ssh -i \$DEPLOY_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"

git config --global --add safe.directory "\$APP_DIR"
rm -f .git/index.lock
for f in .user.ini public/.user.ini; do [ -f "\$f" ] && chattr -i "\$f" 2>/dev/null || true; done

git fetch origin || { echo "FATAL: git fetch failed (check deploy key)"; exit 1; }
git reset --hard origin/\$BRANCH
git checkout -B \$BRANCH origin/\$BRANCH
echo "Now at: \$(git log --oneline -1)"

for f in .user.ini public/.user.ini; do [ -f "\$f" ] && chattr +i "\$f" 2>/dev/null || true; done

composer install --no-dev --optimize-autoloader
npm install && npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan queue:restart
php artisan deploy:record --source=webhook || true
find "\$APP_DIR" -name ".user.ini" -prune -o -exec chown www:www {} +
echo "Deployment complete!"
EOF
chmod +x "$SCRIPT"

echo ""
echo "============================================================"
echo "DONE. Now do these 3 steps:"
echo ""
echo "1. Add this PUBLIC KEY to the repo -> Settings -> Deploy keys:"
echo "------------------------------------------------------------"
cat "$KEY.pub"
echo "------------------------------------------------------------"
echo ""
echo "2. aaPanel -> WebHook -> Add a hook -> Edit -> paste:"
echo "   $SCRIPT  (contents shown above are already saved there)"
echo ""
echo "3. Copy the hook's access_key, then in the repo set GitHub Secret"
echo "   AAPANEL_WEBHOOK_URL = https://<SERVER_IP>:<PANEL_PORT>/hook?access_key=<ACCESS_KEY>"
echo "============================================================"
