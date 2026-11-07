#!/usr/bin/env bash
set -euo pipefail

# SADIAAF_STAGING_READ_ONLY_PRECHECK
# This script never creates containers/databases, edits Plesk or touches
# existing SadiaAF applications. It only reports deployment readiness.
# Run from a clean checkout of the exact approved GitHub commit.

if [[ "${1:---check-only}" != "--check-only" || "$#" -gt 1 ]]; then
  printf 'Usage: %s --check-only\n' "$0" >&2
  exit 2
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
APP_ROOT="/opt/apps/sadiaaf-market-data-staging"
COMPOSE_PROJECT_NAME="sadiaaf-market-data-staging"
API_BIND_PORT=18991
WEB_BIND_PORT=18992
MIN_DISK_KIB=8388608
MIN_AVAILABLE_RAM_KIB=1048576
failed=0

pass() { printf 'PASS %s\n' "$1"; }
block() { printf 'BLOCKED %s\n' "$1" >&2; failed=1; }

printf 'SadiaAF staging read-only preflight\n'
printf 'Staging root: %s\nCompose project: %s\n' "$APP_ROOT" "$COMPOSE_PROJECT_NAME"
printf 'Staging loopback ports: api=%s, web=%s\n' "$API_BIND_PORT" "$WEB_BIND_PORT"

for command_name in git docker df awk ss curl; do
  if command -v "$command_name" >/dev/null 2>&1; then
    pass "command available: $command_name"
  else
    block "required command missing: $command_name"
  fi
done

for path in docker-compose.yml Dockerfile .dockerignore package-lock.json; do
  if [[ -f "$SOURCE_DIR/$path" ]]; then pass "repo file: $path"
  else block "missing repo file: $path"; fi
done

if command -v git >/dev/null 2>&1; then
  if git -C "$SOURCE_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    actual_sha="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
    expected_sha="${SADIAAF_EXPECTED_GIT_SHA:-}"
    if [[ "$expected_sha" =~ ^[a-f0-9]{40}$ && "$actual_sha" == "$expected_sha" ]]; then
      pass "source HEAD matches expected exact SHA: $actual_sha"
    else
      block "set SADIAAF_EXPECTED_GIT_SHA to the exact audited 40-hex commit SHA"
    fi

    if [[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]]; then
      pass "clean Git worktree"
    else
      block "Git worktree has modified or untracked files"
    fi
  else
    block "deployment source must be an auditable Git checkout"
  fi
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    pass "Docker Compose v2 available"
  else
    block "Docker Compose v2 unavailable"
  fi
  if docker info >/dev/null 2>&1; then
    pass "Docker daemon accessible"
  else
    block "Docker daemon unavailable for current identity"
  fi
fi

if command -v df >/dev/null 2>&1; then
  free_kib="$(df -Pk /opt | awk 'NR==2 {print $4}')"
  if [[ "$free_kib" =~ ^[0-9]+$ && "$free_kib" -ge "$MIN_DISK_KIB" ]]; then
    pass "disk available for limited staging pilot: ${free_kib} KiB"
  else
    block "under 8 GiB available on staging filesystem; no new historical ingestion"
  fi
fi

if [[ -r /proc/meminfo ]]; then
  available_ram_kib="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
  if [[ "$available_ram_kib" =~ ^[0-9]+$ && "$available_ram_kib" -ge "$MIN_AVAILABLE_RAM_KIB" ]]; then
    pass "memory currently available: ${available_ram_kib} KiB"
  else
    block "under 1 GiB MemAvailable; request memory sizing before launching new services"
  fi
else
  block "/proc/meminfo unavailable"
fi

if command -v ss >/dev/null 2>&1; then
  for port in "$API_BIND_PORT" "$WEB_BIND_PORT"; do
    if ss -ltn "( sport = :$port )" | grep -q LISTEN; then
      block "staging loopback port $port is already occupied; inspect owner first"
    else
      pass "staging loopback port $port appears unoccupied"
    fi
  done
fi

for domain in sadiaaf.wealthtechinnovations.com api.sadiaaf.wealthtechinnovations.com; do
  path="/var/www/vhosts/wealthtechinnovations.com/$domain"
  if [[ -d "$path" ]]; then
    pass "existing Plesk vhost present and will remain untouched: $domain"
  else
    block "expected existing vhost not found: $domain"
  fi
  if command -v curl >/dev/null 2>&1; then
    status="$(curl --head --silent --show-error --max-time 12 --output /dev/null --write-out '%{http_code}' "https://$domain" || true)"
    printf 'OBSERVED public HTTPS %s: %s (no proxy modification)\n' "$domain" "$status"
  fi
done

if [[ "$failed" -ne 0 ]]; then
  printf 'RESULT BLOCKED: staging prerequisites incomplete. No server changes made.\n' >&2
  exit 3
fi

printf 'RESULT PASS: read-only prerequisites only. This is NOT a staging deployment approval.\n'
