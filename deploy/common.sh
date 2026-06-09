#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "==> $*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

# Load .env without bash "source" — avoids breaking on spaces (e.g. cron) or special chars
load_env_file() {
  local file="$1"
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    line="${line%%#*}"
    line="$(printf '%s' "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -z "$line" ]] && continue
    [[ "$line" != *=* ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    key="$(printf '%s' "$key" | sed 's/[[:space:]]*$//')"
    if [[ "$val" == \"*\" && "$val" == *\" ]]; then
      val="${val:1:${#val}-2}"
    elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
      val="${val:1:${#val}-2}"
    fi
    export "$key=$val"
  done < "$file"
}

require_env() {
  cd "$ROOT_DIR"
  [[ -f .env ]] || fail "Missing .env — copy from .env.local.example or .env.production.example"
  load_env_file .env
}

require_node() {
  command -v node >/dev/null 2>&1 || fail "Node.js 22+ required on host. Install: curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"
  command -v npm >/dev/null 2>&1 || fail "npm not found"
}

wait_postgres() {
  local n=30
  while (( n-- > 0 )); do
    docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-lds_user}" -d "${POSTGRES_DB:-lds_db}" >/dev/null 2>&1 && return
    sleep 2
  done
  fail "PostgreSQL not ready"
}
