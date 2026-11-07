#!/usr/bin/env bash
set -euo pipefail

# Safeguard: never modify live SadiaAF/Plesk domains unless the owner has
# explicitly approved the cutover after the staging, security, database backup
# and restoration gates. This check executes before any filesystem mutation.
if [[ "${SADIAAF_PRODUCTION_CUTOVER_APPROVED:-}" != "YES" ||
      "${SADIAAF_PRODUCTION_GATES_ATTESTED:-}" != "YES" ]]; then
  echo "BLOCKED: S1 public cutover requires explicit approval AND attested deployment gates." >&2
  echo "This script has performed no deployment or modification." >&2
  exit 3
fi

# Release directories change on every deployment. The Compose project name
# MUST NOT change or Docker would create a fresh PostgreSQL named volume,
# making existing data appear lost even though the old volume still exists.
export COMPOSE_PROJECT_NAME="${SADIAAF_COMPOSE_PROJECT_NAME:-sadiaaf-market-data}"
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z][a-z0-9_-]*$ ]] || {
  echo "Invalid stable COMPOSE_PROJECT_NAME" >&2
  exit 3
}

[[ "${EUID:-$(id -u)}" -eq 0 ]] || { echo "Ce script doit être exécuté en root." >&2; exit 2; }

FRONT_DOMAIN="${FRONT_DOMAIN:-sadiaaf.wealthtechinnovations.com}"
API_DOMAIN="${API_DOMAIN:-api.sadiaaf.wealthtechinnovations.com}"
SUBSCRIPTION_ROOT="${SUBSCRIPTION_ROOT:-/var/www/vhosts/wealthtechinnovations.com}"
FRONT_VHOST="$SUBSCRIPTION_ROOT/$FRONT_DOMAIN"
API_VHOST="$SUBSCRIPTION_ROOT/$API_DOMAIN"
APP_ROOT="${APP_ROOT:-/opt/apps/sadiaaf-market-data}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/sadiaaf}"
ENV_FILE="${ENV_FILE:-/etc/sadiaaf-market-data.env}"
API_BIND_PORT="${API_BIND_PORT:-8891}"
WEB_BIND_PORT="${WEB_BIND_PORT:-8892}"
RELEASE_ID="$(date -u +%Y%m%d_%H%M%S)"
BACKUP_DIR="$BACKUP_ROOT/$RELEASE_ID"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_DIR="$APP_ROOT/releases/$RELEASE_ID"
DEPLOY_STARTED=0

rollback_on_error() {
  local exit_code=$?
  if [[ "$DEPLOY_STARTED" -eq 1 ]]; then
    echo "Déploiement échoué, restauration automatique depuis $BACKUP_DIR" >&2
    "$SOURCE_DIR/deploy/s1/rollback.sh" "$BACKUP_DIR" || true
  fi
  exit "$exit_code"
}
trap rollback_on_error ERR

API_BIND_PORT="$API_BIND_PORT" WEB_BIND_PORT="$WEB_BIND_PORT" \
  FRONT_DOMAIN="$FRONT_DOMAIN" API_DOMAIN="$API_DOMAIN" \
  SUBSCRIPTION_ROOT="$SUBSCRIPTION_ROOT" \
  "$SOURCE_DIR/deploy/s1/preflight.sh"

mkdir -p "$BACKUP_DIR" "$RELEASE_DIR" "$APP_ROOT/shared/raw"
DEPLOY_STARTED=1

backup_dir() {
  local source="$1" archive="$2"
  tar --exclude='./logs' --exclude='./.well-known' -czf "$archive" -C "$source" .
}

backup_dir "$FRONT_VHOST" "$BACKUP_DIR/frontend-content.tar.gz"
backup_dir "$API_VHOST" "$BACKUP_DIR/api-content.tar.gz"
# Verify archived contents and record checksums before changing the release.
tar -tzf "$BACKUP_DIR/frontend-content.tar.gz" >/dev/null
tar -tzf "$BACKUP_DIR/api-content.tar.gz" >/dev/null
(
  cd "$BACKUP_DIR"
  sha256sum frontend-content.tar.gz api-content.tar.gz > backup-checksums.sha256
  sha256sum -c backup-checksums.sha256 >/dev/null
)

for domain in "$FRONT_DOMAIN" "$API_DOMAIN"; do
  conf_dir="/var/www/vhosts/system/$domain/conf"
  for file in vhost.conf vhost_ssl.conf; do
    [[ -f "$conf_dir/$file" ]] && cp -a "$conf_dir/$file" "$BACKUP_DIR/$domain-$file"
  done
done

rsync -a --delete \
  --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='data/raw/*' --exclude='.env' \
  "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -sfn "$RELEASE_DIR" "$APP_ROOT/current"
# Bind the release-independent host directory directly into the collector;
# do not create a symlink under a tracked/existing data/raw directory.
export SADIAAF_RAW_HOST_DIR="$APP_ROOT/shared/raw"

if [[ ! -f "$ENV_FILE" ]]; then
  password="$(openssl rand -hex 24)"
  sed \
    -e "s/CHANGE_ME_WITH_A_LONG_RANDOM_SECRET/$password/g" \
    -e "s/API_BIND_PORT=8891/API_BIND_PORT=$API_BIND_PORT/" \
    -e "s/WEB_BIND_PORT=8892/WEB_BIND_PORT=$WEB_BIND_PORT/" \
    "$RELEASE_DIR/.env.production.example" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"

cd "$RELEASE_DIR"
docker compose build --pull
# Migrations avant démarrage des services permanents.
docker compose up -d postgres
for _ in $(seq 1 40); do
  docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-africafunds}" -d "${POSTGRES_DB:-africafunds_market}" >/dev/null 2>&1 && break
  sleep 2
done
docker compose run --rm migrate
docker compose run --rm seed
# Start only the local API and supervision. The collector is deliberately
# excluded until source rights, formats and ingestion acceptance tests pass.
docker compose up -d api web

curl -fsS --retry 20 --retry-delay 2 "http://127.0.0.1:$API_BIND_PORT/health" >/dev/null
curl -fsS --retry 20 --retry-delay 2 "http://127.0.0.1:$WEB_BIND_PORT/health" >/dev/null

proxy_config() {
  local port="$1"
  cat <<CONF
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:$port/ connectiontimeout=5 timeout=120 retry=0
ProxyPassReverse / http://127.0.0.1:$port/
RequestHeader set X-Forwarded-Proto "https" env=HTTPS
CONF
}

for spec in "$FRONT_DOMAIN:$WEB_BIND_PORT" "$API_DOMAIN:$API_BIND_PORT"; do
  domain="${spec%%:*}"
  port="${spec##*:}"
  conf_dir="/var/www/vhosts/system/$domain/conf"
  proxy_config "$port" > "$conf_dir/vhost.conf"
  proxy_config "$port" > "$conf_dir/vhost_ssl.conf"
  plesk sbin httpdmng --reconfigure-domain "$domain"
done

# IMPORTANT: Plesk vhost files and existing applications are never erased.
# The HTTP reverse proxy controls traffic; source content remains on disk.
# Record the release state under the isolated app root, not in either vhost.
printf '%s\n' "Legacy SadiaAF vhost content preserved (no deletion or replacement)." > "$APP_ROOT/LEGACY_VHOSTS_PRESERVED.txt"

curl -fsS --retry 10 --retry-delay 3 "https://$API_DOMAIN/health" >/dev/null
curl -fsS --retry 10 --retry-delay 3 "https://$FRONT_DOMAIN/health" >/dev/null

cat > "$APP_ROOT/DEPLOYMENT_STATE.json" <<STATE
{
  "release_id": "$RELEASE_ID",
  "release_dir": "$RELEASE_DIR",
  "backup_dir": "$BACKUP_DIR",
  "frontend_domain": "$FRONT_DOMAIN",
  "api_domain": "$API_DOMAIN",
  "deployed_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
STATE

trap - ERR
DEPLOY_STARTED=0

echo "Déploiement terminé"
echo "Release : $RELEASE_DIR"
echo "Backup  : $BACKUP_DIR"
echo "Frontend: https://$FRONT_DOMAIN"
echo "API     : https://$API_DOMAIN/health"
echo "Rollback: $RELEASE_DIR/deploy/s1/rollback.sh $BACKUP_DIR"
