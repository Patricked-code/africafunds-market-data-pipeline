#!/usr/bin/env bash
set -euo pipefail

# SadiaAF first installation in an ISOLATED S1 staging project.
# NEVER reconfigure Plesk, touch existing vhosts, stop MCP, delete volumes,
# or auto-migrate a database that already exists. Only three explicit modes.
#
# --plan   : pure read-only output, no server writes or secret access.
# --apply  : FIRST INSTALL ONLY, requires a separate explicit staging approval,
#            exact clean Git SHA, preflight PASS, precreated root-owned secrets.
# --verify : read-only checks of the previously installed staging instance.

MODE="${1:-}"
if [[ "$#" -ne 1 || ( "$MODE" != "--plan" && "$MODE" != "--apply" && "$MODE" != "--verify" ) ]]; then
  echo "Usage: $0 --plan|--apply|--verify" >&2
  exit 2
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
ROOT="/opt/apps/sadiaaf-market-data-staging"
ENV_FILE="/etc/sadiaaf-market-data-staging.env"
PROJECT="sadiaaf-market-data-staging"
RAW_HOST_DIR="$ROOT/shared/raw"
API_PORT=18991
WEB_PORT=18992
VOLUME="${PROJECT}_postgres_data"

blocked() { echo "BLOCKED: $*" >&2; exit 3; }

if [[ "$MODE" == "--plan" ]]; then
  cat <<PLAN
SADIAAF_STAGING_PLAN_ONLY — NO MUTATION
Source: clean Git checkout under operator control (expected SHA required)
Release root: $ROOT/releases/<UTC-timestamp-and-SHA>
Stable project: $PROJECT (NOT wealthtech-mcp-ssh-bridge)
PostgreSQL volume: $VOLUME (first installation only, must not exist)
Raw archive: $RAW_HOST_DIR (persistent between releases)
Local API: 127.0.0.1:$API_PORT
Local dashboard: 127.0.0.1:$WEB_PORT
Secrets (never output): $ENV_FILE (precreated, mode 600, root-owned)
Production domains / Plesk / MCP: NEVER MODIFIED
Initial install: requires SADIAAF_STAGING_FIRST_INSTALL_APPROVED=YES
DB already exists: BLOCKED; migration requires a separate backed-up upgrade process
Rollback: stop only staging services after evidence, NEVER delete volumes or raw
PLAN
  exit 0
fi

# Read-only verification; do not bootstrap new containers or migrations.
if [[ "$MODE" == "--verify" ]]; then
  [[ -d "$ROOT" && ! -L "$ROOT" ]] || blocked "staging root absent or symbolic link"
  [[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] || blocked "staging secrets file absent"
  [[ -L "$ROOT/current" ]] || blocked "staging current release symlink absent"
  RELEASE_DIR="$(readlink -f "$ROOT/current")"
  case "$RELEASE_DIR" in "$ROOT"/releases/*) ;; *) blocked "release pointer escaped staging root";; esac
  [[ -f "$RELEASE_DIR/docker-compose.yml" ]] || blocked "staging Compose file absent"
  export COMPOSE_PROJECT_NAME="$PROJECT"
  export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
  export API_BIND_PORT="$API_PORT"
  export WEB_BIND_PORT="$WEB_PORT"
  COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")
  "${COMPOSE[@]}" config --quiet || blocked "invalid deployed staging Compose model"
  docker volume inspect "$VOLUME" >/dev/null || blocked "staging PostgreSQL volume missing"
  "${COMPOSE[@]}" ps
  curl -fsS --max-time 8 "http://127.0.0.1:$API_PORT/health" || blocked "API health failure"
  curl -fsS --max-time 8 "http://127.0.0.1:$WEB_PORT/health" || blocked "web health failure"
  if [[ -n "$("${COMPOSE[@]}" ps -q collector)" ]]; then blocked "collector unexpectedly active"; fi
  echo "PASS: installed staging services respond; no server state changed by verification"
  exit 0
fi

# APPLY: perform all admission checks BEFORE the first write on S1.
[[ "${SADIAAF_STAGING_FIRST_INSTALL_APPROVED:-}" == "YES" ]] ||
  blocked "first-install staging approval required"
[[ "${SADIAAF_EXPECTED_GIT_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  blocked "exact reviewed 40-character Git commit SHA required"
[[ "${EUID:-$(id -u)}" -eq 0 ]] || blocked "operator must have root on S1"
[[ ! -e "$ROOT" && ! -L "$ROOT" ]] ||
  blocked "staging root already exists: do not overwrite or rerun the first installer"
[[ -f "$ENV_FILE" && ! -L "$ENV_FILE" ]] ||
  blocked "precreated staging secrets file required; do not generate secrets implicitly"
[[ "$(stat -c '%a' "$ENV_FILE")" == "600" && "$(stat -c '%u' "$ENV_FILE")" == "0" ]] ||
  blocked "staging secrets must be root-owned mode 600"

# Names and ports must remain different from MCP and SadiaAF production.
[[ "$PROJECT" != "wealthtech-mcp-ssh-bridge" && "$PROJECT" != "sadiaaf-market-data" ]] ||
  blocked "staging project collides with another application"

for required in docker rsync git curl sha256sum; do
  command -v "$required" >/dev/null 2>&1 || blocked "missing required command: $required"
done

if docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  blocked "PostgreSQL staging volume already exists — backup and restore review required"
fi
if [[ -n "$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT")" ]]; then
  blocked "staging Compose containers already exist — investigate, no overwrites"
fi

# Secrets are deliberately NOT sourced/evaluated into the host shell.
grep -Eiq '^ENABLE_SCHEDULER=(false|0|no|off)$' "$ENV_FILE" ||
  blocked "collector scheduler must be explicitly disabled"
grep -Eq '^API_BIND_PORT=18991$' "$ENV_FILE" || blocked "staging API port mismatch"
grep -Eq '^WEB_BIND_PORT=18992$' "$ENV_FILE" || blocked "staging web port mismatch"
grep -Eq '^DATABASE_URL=postgresql://[^[:space:]]+@postgres:5432/' "$ENV_FILE" ||
  blocked "DB hostname must refer to the isolated Compose postgres service"
# Require generated non-placeholder secrets and a distinct staging DB.
grep -Eq '^POSTGRES_PASSWORD=[a-f0-9]{64}
# A S1 preflight PASS checks memory, disk, ports, Docker and exact Git SHA.
SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA"   "$SOURCE_DIR/deploy/s1/staging-preflight.sh" --check-only ||
  blocked "S1 read-only staging preflight did not pass"

git -C "$SOURCE_DIR" diff --quiet && git -C "$SOURCE_DIR" diff --cached --quiet ||
  blocked "dirty source checkout"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] || blocked "untracked files in source checkout"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA diverged after preflight"

export COMPOSE_PROJECT_NAME="$PROJECT"
export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
export API_BIND_PORT="$API_PORT"
export WEB_BIND_PORT="$WEB_PORT"
export COMPOSE_PROFILES=""
umask 077
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${ACTUAL_SHA:0:12}"
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"

# A fresh staging root guarantees that these directories cannot overwrite
# another application or any previous SadiaAF release.
install -d -m 0700 "$ROOT" "$ROOT/releases" "$ROOT/shared" "$RAW_HOST_DIR"
install -d -m 0700 "$RELEASE_DIR"
rsync -a --safe-links   --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/'   --exclude='/.env' --exclude='/.env.*' --exclude='/data/raw/'   "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$ENV_FILE" "$RELEASE_DIR/.env"
cd "$RELEASE_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --services | grep -qx collector; then
  blocked "collector service should not start from default profile"
fi

# No auto-rollback with down -v: retain all state on failures for diagnosis.
"${COMPOSE[@]}" build api migrate seed
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d api web

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  blocked "staging HTTP endpoint failed: $url"
}
wait_http "http://127.0.0.1:$API_PORT/health"
wait_http "http://127.0.0.1:$WEB_PORT/health"
[[ -z "$("${COMPOSE[@]}" ps -q collector)" ]] ||
  blocked "collector unexpectedly active"

# Only after first successful health checks is a new release pointer published.
ln -s "$RELEASE_DIR" "$ROOT/current"
printf 'git_sha=%s\nrelease_id=%s\n' "$ACTUAL_SHA" "$RELEASE_ID" > "$ROOT/DEPLOYMENT_CHECKPOINT.txt"
echo "DONE: isolated SadiaAF S1 STAGING installed (not publicly exposed)"
echo "Project=$PROJECT"
echo "Git SHA=$ACTUAL_SHA"
echo "API=http://127.0.0.1:$API_PORT/health"
echo "Web=http://127.0.0.1:$WEB_PORT/health"
echo "PostgreSQL and raw volumes preserved; collector disabled"
 "$ENV_FILE" ||
  blocked "PostgreSQL password must be a 64-character lowercase random hex secret"
grep -Eq '^POSTGRES_DB=sadiaaf_market_staging
# A S1 preflight PASS checks memory, disk, ports, Docker and exact Git SHA.
SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA"   "$SOURCE_DIR/deploy/s1/staging-preflight.sh" --check-only ||
  blocked "S1 read-only staging preflight did not pass"

git -C "$SOURCE_DIR" diff --quiet && git -C "$SOURCE_DIR" diff --cached --quiet ||
  blocked "dirty source checkout"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] || blocked "untracked files in source checkout"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA diverged after preflight"

export COMPOSE_PROJECT_NAME="$PROJECT"
export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
export API_BIND_PORT="$API_PORT"
export WEB_BIND_PORT="$WEB_PORT"
export COMPOSE_PROFILES=""
umask 077
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${ACTUAL_SHA:0:12}"
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"

# A fresh staging root guarantees that these directories cannot overwrite
# another application or any previous SadiaAF release.
install -d -m 0700 "$ROOT" "$ROOT/releases" "$ROOT/shared" "$RAW_HOST_DIR"
install -d -m 0700 "$RELEASE_DIR"
rsync -a --safe-links   --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/'   --exclude='/.env' --exclude='/.env.*' --exclude='/data/raw/'   "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$ENV_FILE" "$RELEASE_DIR/.env"
cd "$RELEASE_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --services | grep -qx collector; then
  blocked "collector service should not start from default profile"
fi

# No auto-rollback with down -v: retain all state on failures for diagnosis.
"${COMPOSE[@]}" build api migrate seed
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d api web

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  blocked "staging HTTP endpoint failed: $url"
}
wait_http "http://127.0.0.1:$API_PORT/health"
wait_http "http://127.0.0.1:$WEB_PORT/health"
[[ -z "$("${COMPOSE[@]}" ps -q collector)" ]] ||
  blocked "collector unexpectedly active"

# Only after first successful health checks is a new release pointer published.
ln -s "$RELEASE_DIR" "$ROOT/current"
printf 'git_sha=%s\nrelease_id=%s\n' "$ACTUAL_SHA" "$RELEASE_ID" > "$ROOT/DEPLOYMENT_CHECKPOINT.txt"
echo "DONE: isolated SadiaAF S1 STAGING installed (not publicly exposed)"
echo "Project=$PROJECT"
echo "Git SHA=$ACTUAL_SHA"
echo "API=http://127.0.0.1:$API_PORT/health"
echo "Web=http://127.0.0.1:$WEB_PORT/health"
echo "PostgreSQL and raw volumes preserved; collector disabled"
 "$ENV_FILE" ||
  blocked "database name must be reserved to SadiaAF staging"
grep -Eq '^POSTGRES_USER=sadiaaf_staging
# A S1 preflight PASS checks memory, disk, ports, Docker and exact Git SHA.
SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA"   "$SOURCE_DIR/deploy/s1/staging-preflight.sh" --check-only ||
  blocked "S1 read-only staging preflight did not pass"

git -C "$SOURCE_DIR" diff --quiet && git -C "$SOURCE_DIR" diff --cached --quiet ||
  blocked "dirty source checkout"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] || blocked "untracked files in source checkout"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA diverged after preflight"

export COMPOSE_PROJECT_NAME="$PROJECT"
export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
export API_BIND_PORT="$API_PORT"
export WEB_BIND_PORT="$WEB_PORT"
export COMPOSE_PROFILES=""
umask 077
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${ACTUAL_SHA:0:12}"
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"

# A fresh staging root guarantees that these directories cannot overwrite
# another application or any previous SadiaAF release.
install -d -m 0700 "$ROOT" "$ROOT/releases" "$ROOT/shared" "$RAW_HOST_DIR"
install -d -m 0700 "$RELEASE_DIR"
rsync -a --safe-links   --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/'   --exclude='/.env' --exclude='/.env.*' --exclude='/data/raw/'   "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$ENV_FILE" "$RELEASE_DIR/.env"
cd "$RELEASE_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --services | grep -qx collector; then
  blocked "collector service should not start from default profile"
fi

# No auto-rollback with down -v: retain all state on failures for diagnosis.
"${COMPOSE[@]}" build api migrate seed
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d api web

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  blocked "staging HTTP endpoint failed: $url"
}
wait_http "http://127.0.0.1:$API_PORT/health"
wait_http "http://127.0.0.1:$WEB_PORT/health"
[[ -z "$("${COMPOSE[@]}" ps -q collector)" ]] ||
  blocked "collector unexpectedly active"

# Only after first successful health checks is a new release pointer published.
ln -s "$RELEASE_DIR" "$ROOT/current"
printf 'git_sha=%s\nrelease_id=%s\n' "$ACTUAL_SHA" "$RELEASE_ID" > "$ROOT/DEPLOYMENT_CHECKPOINT.txt"
echo "DONE: isolated SadiaAF S1 STAGING installed (not publicly exposed)"
echo "Project=$PROJECT"
echo "Git SHA=$ACTUAL_SHA"
echo "API=http://127.0.0.1:$API_PORT/health"
echo "Web=http://127.0.0.1:$WEB_PORT/health"
echo "PostgreSQL and raw volumes preserved; collector disabled"
 "$ENV_FILE" ||
  blocked "database user must be reserved to SadiaAF staging"
for critical in POSTGRES_PASSWORD DATABASE_URL POSTGRES_DB POSTGRES_USER ENABLE_SCHEDULER API_BIND_PORT WEB_BIND_PORT; do
  [[ "$(grep -c "^$critical=" "$ENV_FILE" || true)" == "1" ]] ||
    blocked "duplicate or missing critical env key: $critical"
done
# Read secrets only into process memory for consistency comparison.
DB_PASSWORD="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$ENV_FILE")"
DB_URL="$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE")"
[[ "$DB_URL" == "postgresql://sadiaaf_staging:$DB_PASSWORD@postgres:5432/sadiaaf_market_staging" ]] ||
  blocked "DATABASE_URL credentials or database do not match isolated PostgreSQL staging"
unset DB_PASSWORD DB_URL
grep -Eq '^RAW_ARCHIVE_DIR=/app/data/raw
# A S1 preflight PASS checks memory, disk, ports, Docker and exact Git SHA.
SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA"   "$SOURCE_DIR/deploy/s1/staging-preflight.sh" --check-only ||
  blocked "S1 read-only staging preflight did not pass"

git -C "$SOURCE_DIR" diff --quiet && git -C "$SOURCE_DIR" diff --cached --quiet ||
  blocked "dirty source checkout"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] || blocked "untracked files in source checkout"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA diverged after preflight"

export COMPOSE_PROJECT_NAME="$PROJECT"
export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
export API_BIND_PORT="$API_PORT"
export WEB_BIND_PORT="$WEB_PORT"
export COMPOSE_PROFILES=""
umask 077
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${ACTUAL_SHA:0:12}"
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"

# A fresh staging root guarantees that these directories cannot overwrite
# another application or any previous SadiaAF release.
install -d -m 0700 "$ROOT" "$ROOT/releases" "$ROOT/shared" "$RAW_HOST_DIR"
install -d -m 0700 "$RELEASE_DIR"
rsync -a --safe-links   --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/'   --exclude='/.env' --exclude='/.env.*' --exclude='/data/raw/'   "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$ENV_FILE" "$RELEASE_DIR/.env"
cd "$RELEASE_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --services | grep -qx collector; then
  blocked "collector service should not start from default profile"
fi

# No auto-rollback with down -v: retain all state on failures for diagnosis.
"${COMPOSE[@]}" build api migrate seed
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d api web

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  blocked "staging HTTP endpoint failed: $url"
}
wait_http "http://127.0.0.1:$API_PORT/health"
wait_http "http://127.0.0.1:$WEB_PORT/health"
[[ -z "$("${COMPOSE[@]}" ps -q collector)" ]] ||
  blocked "collector unexpectedly active"

# Only after first successful health checks is a new release pointer published.
ln -s "$RELEASE_DIR" "$ROOT/current"
printf 'git_sha=%s\nrelease_id=%s\n' "$ACTUAL_SHA" "$RELEASE_ID" > "$ROOT/DEPLOYMENT_CHECKPOINT.txt"
echo "DONE: isolated SadiaAF S1 STAGING installed (not publicly exposed)"
echo "Project=$PROJECT"
echo "Git SHA=$ACTUAL_SHA"
echo "API=http://127.0.0.1:$API_PORT/health"
echo "Web=http://127.0.0.1:$WEB_PORT/health"
echo "PostgreSQL and raw volumes preserved; collector disabled"
 "$ENV_FILE" ||
  blocked "RAW_ARCHIVE_DIR must point to the collector mounted raw archive"

# A S1 preflight PASS checks memory, disk, ports, Docker and exact Git SHA.
SADIAAF_EXPECTED_GIT_SHA="$SADIAAF_EXPECTED_GIT_SHA"   "$SOURCE_DIR/deploy/s1/staging-preflight.sh" --check-only ||
  blocked "S1 read-only staging preflight did not pass"

git -C "$SOURCE_DIR" diff --quiet && git -C "$SOURCE_DIR" diff --cached --quiet ||
  blocked "dirty source checkout"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] || blocked "untracked files in source checkout"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA diverged after preflight"

export COMPOSE_PROJECT_NAME="$PROJECT"
export SADIAAF_RAW_HOST_DIR="$RAW_HOST_DIR"
export API_BIND_PORT="$API_PORT"
export WEB_BIND_PORT="$WEB_PORT"
export COMPOSE_PROFILES=""
umask 077
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)-${ACTUAL_SHA:0:12}"
RELEASE_DIR="$ROOT/releases/$RELEASE_ID"

# A fresh staging root guarantees that these directories cannot overwrite
# another application or any previous SadiaAF release.
install -d -m 0700 "$ROOT" "$ROOT/releases" "$ROOT/shared" "$RAW_HOST_DIR"
install -d -m 0700 "$RELEASE_DIR"
rsync -a --safe-links   --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/'   --exclude='/.env' --exclude='/.env.*' --exclude='/data/raw/'   "$SOURCE_DIR/" "$RELEASE_DIR/"
ln -s "$ENV_FILE" "$RELEASE_DIR/.env"
cd "$RELEASE_DIR"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$RELEASE_DIR/docker-compose.yml")

"${COMPOSE[@]}" config --quiet
if "${COMPOSE[@]}" config --services | grep -qx collector; then
  blocked "collector service should not start from default profile"
fi

# No auto-rollback with down -v: retain all state on failures for diagnosis.
"${COMPOSE[@]}" build api migrate seed
"${COMPOSE[@]}" up -d postgres
"${COMPOSE[@]}" run --rm migrate
"${COMPOSE[@]}" run --rm seed
"${COMPOSE[@]}" up -d api web

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  blocked "staging HTTP endpoint failed: $url"
}
wait_http "http://127.0.0.1:$API_PORT/health"
wait_http "http://127.0.0.1:$WEB_PORT/health"
[[ -z "$("${COMPOSE[@]}" ps -q collector)" ]] ||
  blocked "collector unexpectedly active"

# Only after first successful health checks is a new release pointer published.
ln -s "$RELEASE_DIR" "$ROOT/current"
printf 'git_sha=%s\nrelease_id=%s\n' "$ACTUAL_SHA" "$RELEASE_ID" > "$ROOT/DEPLOYMENT_CHECKPOINT.txt"
echo "DONE: isolated SadiaAF S1 STAGING installed (not publicly exposed)"
echo "Project=$PROJECT"
echo "Git SHA=$ACTUAL_SHA"
echo "API=http://127.0.0.1:$API_PORT/health"
echo "Web=http://127.0.0.1:$WEB_PORT/health"
echo "PostgreSQL and raw volumes preserved; collector disabled"
