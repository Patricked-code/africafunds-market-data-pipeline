#!/usr/bin/env bash
set -euo pipefail

FRONT_DOMAIN="${FRONT_DOMAIN:-sadiaaf.wealthtechinnovations.com}"
API_DOMAIN="${API_DOMAIN:-api.sadiaaf.wealthtechinnovations.com}"
SUBSCRIPTION_ROOT="${SUBSCRIPTION_ROOT:-/var/www/vhosts/wealthtechinnovations.com}"
FRONT_VHOST="$SUBSCRIPTION_ROOT/$FRONT_DOMAIN"
API_VHOST="$SUBSCRIPTION_ROOT/$API_DOMAIN"
API_BIND_PORT="${API_BIND_PORT:-8891}"
WEB_BIND_PORT="${WEB_BIND_PORT:-8892}"

fail() { echo "ERREUR: $*" >&2; exit 1; }
command -v docker >/dev/null || fail "Docker absent"
docker compose version >/dev/null || fail "Docker Compose v2 absent"
command -v curl >/dev/null || fail "curl absent"
command -v tar >/dev/null || fail "tar absent"
command -v plesk >/dev/null || fail "CLI Plesk absente"
[[ -d "$FRONT_VHOST" ]] || fail "Vhost frontend introuvable: $FRONT_VHOST"
[[ -d "$API_VHOST" ]] || fail "Vhost API introuvable: $API_VHOST"
[[ -d "/var/www/vhosts/system/$FRONT_DOMAIN/conf" ]] || fail "Configuration Plesk frontend introuvable"
[[ -d "/var/www/vhosts/system/$API_DOMAIN/conf" ]] || fail "Configuration Plesk API introuvable"

for port in "$API_BIND_PORT" "$WEB_BIND_PORT"; do
  if ss -ltn "sport = :$port" | tail -n +2 | grep -q .; then
    fail "Le port local $port est déjà utilisé"
  fi
done

free_kb=$(df -Pk /opt | awk 'NR==2 {print $4}')
[[ "${free_kb:-0}" -ge 2097152 ]] || fail "Moins de 2 Gio libres sous /opt"

echo "Précontrôle réussi"
echo "Frontend : $FRONT_DOMAIN -> $FRONT_VHOST"
echo "API      : $API_DOMAIN -> $API_VHOST"
echo "Ports    : web=$WEB_BIND_PORT api=$API_BIND_PORT"
echo "Espace libre /opt : $(df -h /opt | awk 'NR==2 {print $4}')"
echo
echo "Réponses actuelles :"
curl -I --max-time 15 "https://$FRONT_DOMAIN" | sed -n '1,8p' || true
curl -I --max-time 15 "https://$API_DOMAIN" | sed -n '1,8p' || true
