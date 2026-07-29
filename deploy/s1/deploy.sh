#!/usr/bin/env bash
set -euo pipefail

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
ln -sfn "$APP_ROOT/shared/raw" "$RELEASE_DIR/data/raw"

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
docker compose up -d api collector web

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

# L’utilisateur a demandé de retirer les anciennes applications. On conserve seulement
# les logs et les challenges ACME après sauvegarde complète dans BACKUP_DIR.
for target in "$FRONT_VHOST" "$API_VHOST"; do
  find "$target" -mindepth 1 -maxdepth 1 ! -name logs ! -name '.well-known' -exec rm -rf -- {} +
  printf '%s\n' "Ce domaine est désormais servi par le stack Docker AfricaFunds Market Data." > "$target/DEPLOYED_FROM_DOCKER.txt"
done

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
