#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${1:-}"
[[ -n "$BACKUP_DIR" ]] || { echo "Usage: $0 /var/backups/sadiaaf/<timestamp>" >&2; exit 2; }
[[ -d "$BACKUP_DIR" ]] || { echo "Sauvegarde absente: $BACKUP_DIR" >&2; exit 2; }

FRONT_DOMAIN="${FRONT_DOMAIN:-sadiaaf.wealthtechinnovations.com}"
API_DOMAIN="${API_DOMAIN:-api.sadiaaf.wealthtechinnovations.com}"
SUBSCRIPTION_ROOT="${SUBSCRIPTION_ROOT:-/var/www/vhosts/wealthtechinnovations.com}"
APP_ROOT="${APP_ROOT:-/opt/apps/sadiaaf-market-data}"
FRONT_VHOST="$SUBSCRIPTION_ROOT/$FRONT_DOMAIN"
API_VHOST="$SUBSCRIPTION_ROOT/$API_DOMAIN"

if [[ -f "$APP_ROOT/current/docker-compose.yml" ]]; then
  (cd "$APP_ROOT/current" && docker compose down) || true
fi

restore_dir() {
  local archive="$1" target="$2"
  [[ -f "$archive" ]] || return 0
  find "$target" -mindepth 1 -maxdepth 1 ! -name logs ! -name '.well-known' -exec rm -rf -- {} +
  tar -xzf "$archive" -C "$target"
}

restore_dir "$BACKUP_DIR/frontend-content.tar.gz" "$FRONT_VHOST"
restore_dir "$BACKUP_DIR/api-content.tar.gz" "$API_VHOST"

for domain in "$FRONT_DOMAIN" "$API_DOMAIN"; do
  conf_dir="/var/www/vhosts/system/$domain/conf"
  for file in vhost.conf vhost_ssl.conf; do
    if [[ -f "$BACKUP_DIR/$domain-$file" ]]; then
      cp -a "$BACKUP_DIR/$domain-$file" "$conf_dir/$file"
    else
      rm -f "$conf_dir/$file"
    fi
  done
  plesk sbin httpdmng --reconfigure-domain "$domain"
done

echo "Rollback terminé depuis $BACKUP_DIR"
curl -I --max-time 15 "https://$FRONT_DOMAIN" || true
curl -I --max-time 15 "https://$API_DOMAIN" || true
