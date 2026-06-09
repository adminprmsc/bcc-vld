#!/usr/bin/env bash
# Shared helpers for LDS deploy scripts

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}==>${NC} $*"; }
fail() { echo -e "${RED}==> ERROR:${NC} $*" >&2; exit 1; }
info() { echo -e "${BLUE}→${NC} $*"; }

require_root_dir() {
  cd "$ROOT_DIR"
}

require_docker() {
  command -v docker >/dev/null 2>&1 || fail "Docker not installed"
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 required"
}

require_env() {
  require_root_dir
  [[ -f .env ]] || fail ".env not found — cp .env.local.example .env (local) or .env.production.example .env (server)"
  # shellcheck disable=SC1091
  source .env
  [[ -n "${JWT_SECRET:-}" && "${JWT_SECRET}" != *"GENERATE"* && "${JWT_SECRET}" != *"PASTE"* ]] \
    || fail "Set JWT_SECRET in .env"
  [[ -n "${MYSQL_ROOT_PASSWORD:-}" && "${MYSQL_PASSWORD:-}" ]] \
    || fail "Set MYSQL_ROOT_PASSWORD and MYSQL_PASSWORD in .env"
}

wait_for_mysql() {
  local retries=30
  while (( retries > 0 )); do
    if docker compose exec -T mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent 2>/dev/null; then
      return 0
    fi
    sleep 2
    ((retries--))
  done
  fail "MySQL did not become ready"
}
