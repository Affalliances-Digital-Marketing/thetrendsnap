#!/usr/bin/env bash
#
# Runs on the VPS, called by .github/workflows/deploy.yml after it has uploaded:
#
#   $STAGE/web-dist/   built frontend
#   $STAGE/web-src/    frontend source (kept in sync, not served)
#   $STAGE/api/        backend source
#
# Live layout it updates (same folders nginx and pm2 already use):
#
#   /var/www/thetrendsnap.com/dist     served by nginx
#   /var/www/admin.thetrendsnap.com    backend, pm2 process "admin.thetrendsnap.com", port from .env
#
# .env files and node_modules on the server are never overwritten. Every deploy
# takes a backup first; any failure restores it automatically.
#
# Usage: remote-deploy.sh <git-sha>
set -Eeuo pipefail

SHA="${1:-manual}"
SHORT="${SHA:0:8}"

DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/.deploy/thetrendsnap}"
STAGE="$DEPLOY_ROOT/incoming"
BACKUPS="$DEPLOY_ROOT/backups"
WEB_DIR="${WEB_DIR:-/var/www/thetrendsnap.com}"
API_DIR="${API_DIR:-/var/www/admin.thetrendsnap.com}"
PM2_API="${PM2_API:-admin.thetrendsnap.com}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"

log()  { printf '\n\033[1;35m> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mx %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- checks ----
[ -d "$WEB_DIR" ] || fail "missing $WEB_DIR"
[ -d "$API_DIR" ] || fail "missing $API_DIR"
[ -f "$API_DIR/.env" ] || fail "missing $API_DIR/.env - the backend cannot start without it"
[ -f "$STAGE/web-dist/index.html" ] || fail "upload has no web-dist/index.html"
[ -f "$STAGE/api/server.js" ] || fail "upload has no api/server.js"
command -v pm2 >/dev/null || fail "pm2 not found on PATH"

API_PORT="$(grep -E '^PORT=' "$API_DIR/.env" | tail -1 | cut -d= -f2 | tr -d '"'"'"'[:space:]')"
API_PORT="${API_PORT:-9000}"

# ---------------------------------------------------------------- backup ----
BACKUP="$BACKUPS/$(date +%Y%m%d-%H%M%S)-$SHORT"
log "backing up to $BACKUP"
mkdir -p "$BACKUP"
tar -czf "$BACKUP/api.tgz" -C "$API_DIR" --exclude=./node_modules .
[ -d "$WEB_DIR/dist" ] && cp -a "$WEB_DIR/dist" "$BACKUP/dist"
LOCK_BEFORE="$(sha1sum "$API_DIR/package-lock.json" 2>/dev/null | cut -d' ' -f1 || true)"
INSTALLED_LOCK="$LOCK_BEFORE"

start_api() {
  if pm2 describe "$PM2_API" >/dev/null 2>&1; then
    pm2 reload "$PM2_API" --update-env
  else
    (cd "$API_DIR" && pm2 start server.js --name "$PM2_API" --cwd "$API_DIR" --time)
  fi
  pm2 save >/dev/null
}

rollback() {
  printf '\n\033[1;33m<- deploy failed, restoring backup %s\033[0m\n' "$BACKUP" >&2
  set +e
  tar -xzf "$BACKUP/api.tgz" -C "$API_DIR"
  # Reinstall only if node_modules was changed for the failed version.
  if [ "$INSTALLED_LOCK" != "$LOCK_BEFORE" ] || [ ! -d "$API_DIR/node_modules" ]; then
    (cd "$API_DIR" && npm ci --omit=dev --no-audit --no-fund)
  fi
  start_api
  if [ -d "$BACKUP/dist" ]; then
    rm -rf "$WEB_DIR/dist" && cp -a "$BACKUP/dist" "$WEB_DIR/dist"
  fi
  echo "restored previous version" >&2
}
trap rollback ERR

# --------------------------------------------------------------- backend ----
# The process used to run `npm run dev` (nodemon). nodemon restarts on every
# file change, which would restart the API halfway through the copy below, and
# it is a dev dependency that a production install removes. Replace it once
# with a plain `node server.js` under the same name.
if pm2 describe "$PM2_API" 2>/dev/null | grep -q "run dev"; then
  log "switching pm2 '$PM2_API' from 'npm run dev' to 'node server.js'"
  pm2 delete "$PM2_API" >/dev/null
fi

log "updating backend code"
rsync -a --exclude node_modules --exclude '.env*' "$STAGE/api/" "$API_DIR/"

LOCK_AFTER="$(sha1sum "$API_DIR/package-lock.json" | cut -d' ' -f1)"
if [ "$LOCK_BEFORE" != "$LOCK_AFTER" ] || [ ! -d "$API_DIR/node_modules" ]; then
  log "installing backend dependencies"
  INSTALLED_LOCK="changed"
  (cd "$API_DIR" && npm ci --omit=dev --no-audit --no-fund)
else
  log "backend dependencies unchanged"
fi

log "reloading pm2 '$PM2_API'"
start_api

log "backend health check on 127.0.0.1:$API_PORT"
ok=false
for _ in $(seq 1 20); do
  if curl -fsS --max-time 4 "http://127.0.0.1:$API_PORT/api/health" >/dev/null; then
    ok=true; break
  fi
  sleep 2
done
$ok || fail "backend did not answer on 127.0.0.1:$API_PORT/api/health - see: pm2 logs $PM2_API"

# -------------------------------------------------------------- frontend ----
log "updating frontend source"
rsync -a --exclude node_modules --exclude dist --exclude '.env*' "$STAGE/web-src/" "$WEB_DIR/"

log "switching frontend build"
rm -rf "$WEB_DIR/dist.new"
cp -a "$STAGE/web-dist" "$WEB_DIR/dist.new"
chmod -R a+rX "$WEB_DIR/dist.new"
rm -rf "$WEB_DIR/dist.prev"
[ -d "$WEB_DIR/dist" ] && mv "$WEB_DIR/dist" "$WEB_DIR/dist.prev"
mv "$WEB_DIR/dist.new" "$WEB_DIR/dist"
[ -f "$WEB_DIR/dist/index.html" ] || fail "live dist has no index.html"

trap - ERR

# ---------------------------------------------------------------- tidy up ----
ls -1dt "$BACKUPS"/*/ 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -rf
echo "$SHA $(date -Is)" > "$DEPLOY_ROOT/current-version"

log "deployed $SHORT"
