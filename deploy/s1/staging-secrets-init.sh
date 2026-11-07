#!/usr/bin/env bash
set -euo pipefail

# Initialize FIRST-TIME SadiaAF staging credentials only.
# No secrets are printed, no existing file is replaced, no production env is read.
MODE="${1:-}"
if [[ "$#" -ne 1 || ( "$MODE" != "--plan" && "$MODE" != "--apply" ) ]]; then
  echo "Usage: $0 --plan|--apply" >&2
  exit 2
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
ENV_FILE="/etc/sadiaaf-market-data-staging.env"
TEMPLATE="$SOURCE_DIR/deploy/s1/staging.env.example"
blocked() { echo "BLOCKED: $*" >&2; exit 3; }

if [[ "$MODE" == "--plan" ]]; then
  echo "PLAN ONLY — create root-owned mode-600 $ENV_FILE from the Git-tracked staging template"
  echo "Generate independent PostgreSQL 64-hex credential using OpenSSL"
  echo "No public-domain, Plesk, MCP, Docker or production environment changes"
  exit 0
fi

[[ "${SADIAAF_STAGING_SECRETS_APPROVED:-}" == "YES" ]] ||
  blocked "explicit staging secret creation approval required"
[[ "${SADIAAF_EXPECTED_GIT_SHA:-}" =~ ^[a-f0-9]{40}$ ]] ||
  blocked "expected exact Git SHA missing"
[[ "${EUID:-$(id -u)}" -eq 0 ]] || blocked "root authority required"
[[ -f "$TEMPLATE" && ! -L "$TEMPLATE" ]] || blocked "staging secrets template missing"
[[ ! -e "$ENV_FILE" && ! -L "$ENV_FILE" ]] ||
  blocked "staging secrets already exist; refusing to overwrite"
[[ -d /etc && ! -L /etc ]] || blocked "/etc must be a real directory"
command -v openssl >/dev/null 2>&1 || blocked "openssl missing"
command -v git >/dev/null 2>&1 || blocked "git missing"
command -v mktemp >/dev/null 2>&1 || blocked "mktemp missing"
ACTUAL_SHA="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
[[ "$ACTUAL_SHA" == "$SADIAAF_EXPECTED_GIT_SHA" ]] || blocked "Git SHA mismatch"
[[ -z "$(git -C "$SOURCE_DIR" status --porcelain)" ]] ||
  blocked "checkout is not clean"

umask 077
TMP="$(mktemp /etc/.sadiaaf-market-data-staging.env.XXXXXXXX)"
cleanup() {
  # Only the temporary file created by this operation may be unlinked.
  [[ -e "$TMP" ]] && rm -f -- "$TMP"
}
trap cleanup EXIT
PASSWORD="$(openssl rand -hex 32)"
[[ "$PASSWORD" =~ ^[a-f0-9]{64}$ ]] || blocked "random credential generation failed"
# Bash substitution avoids exposing the secret through a sed command-line
# argument visible in the process list.
TEMPLATE_CONTENT="$(cat "$TEMPLATE")"
TEMPLATE_CONTENT="${TEMPLATE_CONTENT//REPLACE_WITH_64_LOWERCASE_HEX_CHARACTERS/$PASSWORD}"
printf '%s\n' "$TEMPLATE_CONTENT" > "$TMP"
unset TEMPLATE_CONTENT
chmod 600 "$TMP"
[[ "$(grep -c "^POSTGRES_PASSWORD=$PASSWORD$" "$TMP")" == "1" ]] ||
  blocked "password substitution failed"
grep -Fq "postgresql://sadiaaf_staging:$PASSWORD@postgres:5432/sadiaaf_market_staging" "$TMP" ||
  blocked "DATABASE_URL substitution failed"
unset PASSWORD

# Atomic no-clobber creation. Hard-linking fails if the destination appears
# concurrently, unlike a simple mv to the live secrets path.
ln -- "$TMP" "$ENV_FILE" || blocked "secrets file already exists or cannot be created"
echo "DONE: unique staging credentials written, root owned, mode 600 (not displayed)"
echo "Secrets path: $ENV_FILE"
