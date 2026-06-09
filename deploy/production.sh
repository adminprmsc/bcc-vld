#!/usr/bin/env bash
# Production — ./deploy/production.sh deploy|migrate|seed|backup|verify
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

deploy() {
  require_env
  log "Build & start..."
  docker compose up -d --build
  wait_postgres
  migrate
  seed
  verify
}

migrate() {
  require_env
  wait_postgres
  docker compose exec -T backend npm run migrate
}

seed() {
  require_env
  local extra=()
  [[ "${1:-}" == "--reset" ]] && extra+=(-e SEED_ADMIN_RESET=true)
  docker compose exec -T "${extra[@]}" backend npm run seed
}

verify() {
  require_env
  docker compose ps
  curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" | grep -q '"database":"connected"' \
    || fail "API unhealthy"
  log "OK"
}

backup() {
  require_env
  local dest="${BACKUP_DIR}/$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$dest"
  docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-lds_user}" "${POSTGRES_DB:-lds_db}" \
    | gzip > "${dest}/postgres.sql.gz"
  docker compose exec -T backend tar czf - -C /app/uploads . > "${dest}/uploads.tar.gz" 2>/dev/null || true
  find "${BACKUP_DIR}" -maxdepth 1 -type d -name '20*' -mtime +"${BACKUP_RETENTION_DAYS:-90}" -exec rm -rf {} + 2>/dev/null || true
  log "Backup: ${dest}"
}

case "${1:-help}" in
  init)    [[ -f .env ]] || cp .env.production.example .env; log "Edit .env then: ./deploy/production.sh deploy" ;;
  deploy)  deploy ;;
  migrate) migrate ;;
  seed)    seed "${2:-}" ;;
  verify)  verify ;;
  backup)  backup ;;
  logs)    require_env; docker compose logs -f --tail=100 "${2:-}" ;;
  *)
    cat <<EOF
Usage: ./deploy/production.sh <command>

  init     Create .env from template
  deploy   Build + migrate + seed + verify
  migrate  prisma migrate deploy
  seed     prisma db seed [--reset]
  verify   Health check
  backup   DB + uploads snapshot
  logs     Tail logs
EOF
    ;;
esac
