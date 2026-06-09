#!/usr/bin/env bash
# Production — ./deploy/production.sh deploy|migrate|seed|backup|verify
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.production.yml)
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

build_on_host() {
  require_node
  log "Build backend on host (avoids npm network errors inside Docker)..."
  (cd "${ROOT_DIR}/backend" && npm ci && npm run build && npm prune --omit=dev)
  log "Build frontend on host..."
  (cd "${ROOT_DIR}/frontend" && npm ci && npm run build -- --configuration=production)
}

deploy() {
  require_env
  build_on_host
  log "Docker build & start..."
  "${COMPOSE[@]}" up -d --build
  wait_postgres
  migrate
  seed
  verify
}

migrate() {
  require_env
  wait_postgres
  "${COMPOSE[@]}" exec -T backend npm run migrate
}

seed() {
  require_env
  local extra=()
  [[ "${1:-}" == "--reset" ]] && extra+=(-e SEED_ADMIN_RESET=true)
  "${COMPOSE[@]}" exec -T "${extra[@]}" backend npm run seed
}

verify() {
  require_env
  "${COMPOSE[@]}" ps
  curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" | grep -q '"database":"connected"' \
    || fail "API unhealthy"
  log "OK"
}

backup() {
  require_env
  local dest="${BACKUP_DIR}/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$dest"
  "${COMPOSE[@]}" exec -T postgres pg_dump -U "${POSTGRES_USER:-lds_user}" "${POSTGRES_DB:-lds_db}" \
    | gzip > "${dest}/postgres.sql.gz"
  "${COMPOSE[@]}" exec -T backend tar czf - -C /app/uploads . > "${dest}/uploads.tar.gz" 2>/dev/null || true
  find "${BACKUP_DIR}" -maxdepth 1 -type d -name '20*' -mtime +"${BACKUP_RETENTION_DAYS:-90}" -exec rm -rf {} + 2>/dev/null || true
  log "Backup: ${dest}"
}

init() {
  cd "$ROOT_DIR"
  if [[ -f .env ]]; then
    log ".env already exists — edit ${ROOT_DIR}/.env for production values"
  else
    [[ -f .env.production.example ]] || fail "Missing .env.production.example in repo root"
    cp .env.production.example .env
    log "Created ${ROOT_DIR}/.env from .env.production.example"
  fi
  log "Next: nano .env  (set JWT_SECRET, POSTGRES_PASSWORD, SEED_ADMIN_PASSWORD)"
  log "Then:  ./deploy/production.sh deploy"
}

case "${1:-help}" in
  init)    init ;;
  deploy)  deploy ;;
  migrate) migrate ;;
  seed)    seed "${2:-}" ;;
  verify)  verify ;;
  backup)  backup ;;
  logs)    require_env; "${COMPOSE[@]}" logs -f --tail=100 "${2:-}" ;;
  *)
    cat <<EOF
Usage: ./deploy/production.sh <command>

  init     Create .env from template
  deploy   Host npm build + Docker start + migrate + seed + verify
  migrate  prisma migrate deploy
  seed     prisma db seed [--reset]
  verify   Health check
  backup   DB + uploads snapshot
  logs     Tail logs
EOF
    ;;
esac
