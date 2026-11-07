#!/usr/bin/env bash
set -euo pipefail

# Match the fixed Compose project name from deploy.sh so rollback stops the
# intended service stack without targeting a fresh release-scoped volume.
export COMPOSE_PROJECT_NAME="${SADIAAF_COMPOSE_PROJECT_NAME:-sadiaaf-market-data}"
[[ "$COMPOSE_PROJECT_NAME" =~ ^[a-z][a-z0-9_-]*$ ]] || {
  echo "Invalid stable COMPOSE_PROJECT_NAME" >&2
  exit 3
}

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
  [[ -f "$archive" ]] || { echo "Missing backup archive: $archive" >&2; return 1; }
  tar -tzf "$archive" >/dev/null
  # The safe deployment leaves legacy vhosts intact. Do not overwrite live
  # files when rolling back Apache proxies; only restore original content
  # after a separate explicit decision (e.g. rollback of an older release).
  if [[ "${SADIAAF_RESTORE_VHOST_CONTENT:-}" == "YES" ]]; then
    tar -xzf "$archive" -C "$target"
  else
    echo "Preserved existing vhost files; backup archive verified: $archive"
  fi
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

echo "Rollback de code/proxy depuis $BACKUP_DIR ; aucune suppression de volume PostgreSQL."
echo "NOTE: une migration SQL déjà appliquée exige une procédure de restauration DB séparée et attestée."
curl -I --max-time 15 "https://$FRONT_DOMAIN" || true
curl -I --max-time 15 "https://$API_DOMAIN" || true
