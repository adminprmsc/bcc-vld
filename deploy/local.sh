#!/usr/bin/env bash
# Local Mac — ./deploy/local.sh up|down|migrate|seed|logs|db
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml)

up() {
  [[ -f .env ]] || cp .env.local.example .env
  require_env
  log "Build backend on host..."
  (cd backend && npm ci && npm run build)
  log "Build frontend on host..."
  (cd frontend && npm ci && npm run build -- --configuration=production)
  log "Docker build & start..."
  "${COMPOSE[@]}" build
  "${COMPOSE[@]}" up -d
  wait_postgres
  migrate
  seed
  curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" | grep -q '"database":"connected"' && log "Ready: http://localhost"
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

pull_backup() {
  require_env
  : "${LDS_SERVER_HOST:?Set LDS_SERVER_HOST in .env}"
  : "${LDS_SSH_USER:?Set LDS_SSH_USER in .env}"
  local key="${LDS_SSH_KEY:-}"
  local remote="${LDS_REMOTE_DIR:-/opt/lds}"
  local dest="${LDS_MAC_BACKUP_DIR:-./backups-from-server}"
  local ssh_cmd=(ssh -o BatchMode=yes)
  [[ -n "$key" ]] && ssh_cmd+=(-i "$key")
  mkdir -p "$dest"
  log "Backup on server..."
  "${ssh_cmd[@]}" "${LDS_SSH_USER}@${LDS_SERVER_HOST}" "cd ${remote} && ./deploy/production.sh backup"
  log "Download to ${dest}..."
  RSYNC_RSH="${ssh_cmd[*]}" rsync -avz --progress \
    "${LDS_SSH_USER}@${LDS_SERVER_HOST}:${remote}/backups/" "$dest/"
  log "Done: ${dest}"
}

case "${1:-help}" in
  up)      up ;;
  down)    require_env; "${COMPOSE[@]}" down "${@:2}" ;;
  build)   require_env; "${COMPOSE[@]}" build ;;
  migrate) migrate ;;
  seed)    seed "${2:-}" ;;
  logs)    require_env; "${COMPOSE[@]}" logs -f --tail=100 "${2:-}" ;;
  db)      require_env; docker compose exec -it postgres psql -U "${POSTGRES_USER:-lds_user}" -d "${POSTGRES_DB:-lds_db}" ;;
  backup)      "${DIR}/production.sh" backup ;;
  pull-backup) pull_backup ;;
  *)
    cat <<EOF
Usage: ./deploy/local.sh <command>

  up           Build + start + migrate + seed
  down         Stop stack
  migrate      prisma migrate deploy
  seed         prisma db seed [--reset]
  logs         Tail logs
  db           PostgreSQL shell
  backup       DB snapshot (local Docker stack)
  pull-backup  Backup on VM + download to ./backups-from-server/
EOF
    ;;
esac
