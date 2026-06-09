#!/usr/bin/env bash
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log()  { echo "==> $*"; }
fail() { echo "ERROR: $*" >&2; exit 1; }

require_env() {
  cd "$ROOT_DIR"
  [[ -f .env ]] || fail "Missing .env — copy from .env.local.example or .env.production.example"
  # shellcheck disable=SC1091
  source .env
}

wait_postgres() {
  local n=30
  while (( n-- > 0 )); do
    docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-lds_user}" -d "${POSTGRES_DB:-lds_db}" >/dev/null 2>&1 && return
    sleep 2
  done
  fail "PostgreSQL not ready"
}
