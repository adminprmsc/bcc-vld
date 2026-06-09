#!/usr/bin/env bash
# Local Mac — build, run, and manage the stack
# Usage: ./deploy/local.sh <command>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/remote-backup.sh
source "${SCRIPT_DIR}/lib/remote-backup.sh"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml)

restore_dockerignore() {
  for dir in backend frontend; do
    [[ -f "$dir/.dockerignore.bak" ]] && mv "$dir/.dockerignore.bak" "$dir/.dockerignore"
  done
}

patch_dockerignore() {
  local dir="$1"
  shift
  cp "$dir/.dockerignore" "$dir/.dockerignore.bak"
  local content
  content="$(cat "$dir/.dockerignore.bak")"
  for line in "$@"; do
    content="$(printf '%s\n' "$content" | grep -vx "$line")"
  done
  printf '%s\n' "$content" > "$dir/.dockerignore"
}

cmd_init() {
  require_root_dir
  if [[ -f .env ]]; then
    warn ".env already exists"
    return
  fi
  cp .env.local.example .env
  log "Created .env from .env.local.example"
}

cmd_build() {
  require_root_dir
  require_docker

  log "Installing backend deps on host..."
  (cd backend && npm ci --omit=dev)

  log "Building frontend on host..."
  (cd frontend && npm ci && npm run build -- --configuration=production)

  log "Building Docker images..."
  patch_dockerignore backend node_modules
  patch_dockerignore frontend dist
  trap restore_dockerignore EXIT
  "${COMPOSE[@]}" build "$@"
  restore_dockerignore
  trap - EXIT
}

cmd_up() {
  cmd_init
  cmd_build
  require_env
  log "Starting stack..."
  "${COMPOSE[@]}" up -d
  wait_for_mysql
  cmd_migrate
  cmd_seed
  cmd_verify
  info "Open http://localhost — login: admin@lds.gov.pk / Admin@123"
}

cmd_down() {
  require_root_dir
  require_docker
  "${COMPOSE[@]}" down "$@"
}

cmd_migrate() {
  require_env
  require_docker
  wait_for_mysql
  docker compose exec -T backend node scripts/run-migrations.js
}

cmd_seed() {
  require_env
  require_docker
  docker compose exec -T backend node scripts/seed-admin.js
}

cmd_db() {
  require_env
  require_docker
  docker compose exec -it mysql mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}"
}

cmd_verify() {
  require_env
  require_docker
  "${COMPOSE[@]}" ps
  curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" | grep -q '"mysql":"connected"' \
    && log "API healthy" || fail "API not healthy — run: ./deploy/local.sh logs backend"
}

cmd_status() {
  require_root_dir
  require_docker
  "${COMPOSE[@]}" ps
}

cmd_logs() {
  require_root_dir
  require_docker
  local service="${1:-}"
  if [[ -n "$service" ]]; then
    "${COMPOSE[@]}" logs -f --tail=100 "$service"
  else
    "${COMPOSE[@]}" logs -f --tail=50
  fi
}

cmd_backup() {
  require_env
  require_docker
  "${SCRIPT_DIR}/production.sh" backup
}

cmd_pull_backup() {
  pull_backups_from_server
}

cmd_sync_backup() {
  sync_backup_from_server
}

cmd_help() {
  cat <<EOF
Local Mac commands
==================

First time:
  ./deploy/local.sh init       Create .env from .env.local.example
  ./deploy/local.sh up         Build + start + migrate + seed

Daily:
  ./deploy/local.sh status     Container status
  ./deploy/local.sh logs       Tail all logs
  ./deploy/local.sh db         MySQL shell (127.0.0.1:3306 in GUI tools)

Other:
  ./deploy/local.sh build      Rebuild images only
  ./deploy/local.sh migrate    Run DB migrations
  ./deploy/local.sh seed       Create admin user
  ./deploy/local.sh verify     Health check
  ./deploy/local.sh down       Stop containers
  ./deploy/local.sh down -v    Stop + delete DB (destructive)

Backups (Mac):
  ./deploy/local.sh backup         Full local DB snapshot (if stack running)
  ./deploy/local.sh pull-backup    Copy server backups → Mac (needs LDS_* in .env)
  ./deploy/local.sh sync-backup    Backup on server, then copy → Mac

Guide: deploy/README.md
EOF
}

main() {
  local command="${1:-help}"
  shift || true
  case "$command" in
    init)    cmd_init ;;
    build)   cmd_build "$@" ;;
    up)      cmd_up ;;
    down)    cmd_down "$@" ;;
    migrate) cmd_migrate ;;
    seed)    cmd_seed ;;
    db)      cmd_db ;;
    verify)  cmd_verify ;;
    status)  cmd_status ;;
    logs)        cmd_logs "$@" ;;
    backup)      cmd_backup ;;
    pull-backup) cmd_pull_backup ;;
    sync-backup) cmd_sync_backup ;;
    help|-h|--help) cmd_help ;;
    *) fail "Unknown: $command. Run: ./deploy/local.sh help" ;;
  esac
}

main "$@"
