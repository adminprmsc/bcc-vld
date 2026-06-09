#!/usr/bin/env bash
# Production server — deploy, backup, verify
# Usage: ./deploy/production.sh <command>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD_SCRIPT="${SCRIPT_DIR}/production.sh"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-90}"
# Weekly Sunday 2 AM — override in .env: BACKUP_CRON="0 2 * * 0"
BACKUP_CRON="${BACKUP_CRON:-0 2 * * 0}"
LOG_FILE="/var/log/lds-ops.log"

cmd_init() {
  require_root_dir
  if [[ -f .env ]]; then
    warn ".env already exists"
    return
  fi
  cp .env.production.example .env
  log "Created .env — edit secrets before deploy"
  info "Generate JWT: openssl rand -hex 64"
}

cmd_setup() {
  require_root_dir
  require_docker
  log "Setting up production operations..."
  chmod +x "${SCRIPT_DIR}/production.sh" "${SCRIPT_DIR}/lds.sh" 2>/dev/null || true
  systemctl enable docker 2>/dev/null || true

  if [[ ! -f /etc/docker/daemon.json ]]; then
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-driver-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    systemctl restart docker 2>/dev/null || warn "Restart Docker manually for log rotation"
  fi

  cmd_setup_cron
  log "Setup complete. Run: ./deploy/production.sh verify"
}

cmd_setup_cron() {
  require_root_dir
  chmod +x "${PROD_SCRIPT}"
  # shellcheck disable=SC1091
  [[ -f .env ]] && source .env

  local backup_cron="${BACKUP_CRON:-0 2 * * 0} cd ${ROOT_DIR} && ${PROD_SCRIPT} backup >> ${LOG_FILE} 2>&1"
  local health_cron="*/5 * * * * cd ${ROOT_DIR} && ${PROD_SCRIPT} health >> ${LOG_FILE} 2>&1"
  local current
  current="$(crontab -l 2>/dev/null | grep -v 'production.sh backup' || true)"

  (echo "$current"; echo "$backup_cron") | crontab -
  log "Weekly full backup cron (${BACKUP_CRON:-0 2 * * 0} — Sunday 2:00 AM)"

  current="$(crontab -l 2>/dev/null || true)"
  if echo "$current" | grep -q "production.sh health"; then
    warn "Health cron already installed"
  else
    (echo "$current"; echo "$health_cron") | crontab -
    log "Health cron (every 5 min)"
  fi
}

cmd_pre_deploy() {
  require_env
  require_docker
  log "Pre-deploy backup..."
  cmd_backup
}

cmd_deploy() {
  require_env
  require_docker
  log "Building and starting stack..."
  docker compose up -d --build
  wait_for_mysql
  cmd_migrate
  sleep 10
  cmd_post_deploy
}

cmd_post_deploy() {
  require_env
  require_docker
  local backend_ok nginx_ok
  backend_ok=$(docker compose exec -T backend node -e \
    "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" \
    && echo ok || echo fail)
  nginx_ok=$(curl -sf "http://localhost:${HTTP_PORT:-80}/health" >/dev/null && echo ok || echo fail)

  if [[ "$backend_ok" == "ok" && "$nginx_ok" == "ok" ]]; then
    log "Deployment successful"
    cmd_verify
  else
    docker compose ps
    fail "Post-deploy checks failed"
  fi
}

cmd_migrate() {
  require_env
  require_docker
  wait_for_mysql
  docker compose exec -T backend node scripts/run-migrations.js
}

cmd_verify() {
  require_env
  require_docker
  docker compose ps
  local mysql_status
  mysql_status=$(docker inspect --format='{{.State.Health.Status}}' lds-mysql 2>/dev/null || echo unknown)
  [[ "$mysql_status" == "healthy" ]] && log "MySQL: healthy" || fail "MySQL: $mysql_status"

  docker compose exec -T mysql mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD}" --silent \
    && log "MySQL: ping OK" || fail "MySQL ping failed"

  local api
  api=$(curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" || echo FAIL)
  echo "$api"
  echo "$api" | grep -q '"mysql":"connected"' && log "All checks passed" || fail "Backend DB connection failed"
}

cmd_backup() {
  require_env
  require_docker
  local timestamp dest
  timestamp="$(date +%Y%m%d_%H%M%S)"
  dest="${BACKUP_DIR}/${timestamp}"
  mkdir -p "$dest"

  log "Full database snapshot (all tables, all data) → ${dest}/mysql.sql.gz"
  docker compose exec -T mysql mysqldump \
    -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
    --single-transaction --routines --triggers \
    "${MYSQL_DATABASE}" | gzip > "${dest}/mysql.sql.gz"

  docker compose exec -T backend tar czf - -C /app/uploads . > "${dest}/uploads.tar.gz" 2>/dev/null || true
  echo "${timestamp}" > "${dest}/.backup-meta"
  find "${BACKUP_DIR}" -maxdepth 1 -type d -name '20*' -mtime +"${BACKUP_RETENTION_DAYS:-90}" -exec rm -rf {} + 2>/dev/null || true
  log "Backup complete: ${dest} (folders older than ${BACKUP_RETENTION_DAYS:-90} days removed)"
  ls -lh "${dest}"
}

cmd_restore() {
  require_env
  require_docker
  local backup_path="${1:-}"
  [[ -n "$backup_path" && -d "$backup_path" ]] || fail "Usage: ./deploy/production.sh restore backups/YYYYMMDD_HHMMSS"
  [[ -f "${backup_path}/mysql.sql.gz" ]] || fail "Missing mysql.sql.gz"

  warn "This overwrites current data"
  read -r -p "Type RESTORE to continue: " confirm
  [[ "$confirm" == "RESTORE" ]] || fail "Aborted"

  cmd_backup
  gunzip -c "${backup_path}/mysql.sql.gz" | docker compose exec -T mysql mysql \
    -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}"

  if [[ -f "${backup_path}/uploads.tar.gz" ]]; then
    docker compose exec -T backend sh -c "mkdir -p /app/uploads && rm -rf /app/uploads/*"
    gunzip -c "${backup_path}/uploads.tar.gz" | docker compose exec -T backend tar xzf - -C /app/uploads
  fi
  docker compose restart backend
  log "Restore complete — run: ./deploy/production.sh verify"
}

cmd_health() {
  require_root_dir
  [[ -f .env ]] || exit 0
  # shellcheck disable=SC1091
  source .env
  curl -sf "http://localhost:${HTTP_PORT:-80}/api/health" | grep -q '"mysql":"connected"' || {
    echo "$(date -Iseconds) UNHEALTHY" >&2
    exit 1
  }
}

cmd_status() {
  require_env
  require_docker
  docker compose ps
  df -h / | tail -1
  free -h 2>/dev/null | head -2 || true
  du -sh "${BACKUP_DIR}" 2>/dev/null || echo "No backups yet"
}

cmd_logs() {
  require_root_dir
  require_docker
  local service="${1:-}"
  [[ -n "$service" ]] && docker compose logs -f --tail=100 "$service" || docker compose logs -f --tail=50
}

cmd_help() {
  cat <<EOF
Production server commands
==========================

First time:
  ./deploy/production.sh init       Create .env from .env.production.example
  ./deploy/production.sh setup      Cron + Docker log rotation
  ./deploy/production.sh deploy     Build, migrate, verify

Every update:
  ./deploy/production.sh pre-deploy
  git pull
  ./deploy/production.sh deploy

Operations:
  ./deploy/production.sh status     Containers + disk
  ./deploy/production.sh verify     Health checks
  ./deploy/production.sh backup     DB + uploads backup
  ./deploy/production.sh restore <dir>
  ./deploy/production.sh migrate    Migrations only
  ./deploy/production.sh logs [svc]

Guide: deploy/README.md
EOF
}

main() {
  local command="${1:-help}"
  shift || true
  case "$command" in
    init)        cmd_init ;;
    setup)       cmd_setup ;;
    setup-cron)  cmd_setup_cron ;;
    pre-deploy)  cmd_pre_deploy ;;
    deploy)      cmd_deploy ;;
    post-deploy) cmd_post_deploy ;;
    migrate)     cmd_migrate ;;
    verify)      cmd_verify ;;
    backup)      cmd_backup ;;
    restore)     cmd_restore "$@" ;;
    health)      cmd_health ;;
    status)      cmd_status ;;
    logs)        cmd_logs "$@" ;;
    help|-h|--help) cmd_help ;;
    *) fail "Unknown: $command. Run: ./deploy/production.sh help" ;;
  esac
}

main "$@"
