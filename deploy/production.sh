#!/usr/bin/env bash
# Production — ./deploy/production.sh deploy|migrate|seed|backup|verify
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=common.sh
source "${DIR}/common.sh"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.production.yml)
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"

BACKEND_DOCKERIGNORE_BAK=""

build_on_host() {
  require_node
  log "Build backend on host (avoids npm network errors inside Docker)..."
  (cd "${ROOT_DIR}/backend" && npm ci && npm run build && npm prune --omit=dev)
  [[ -d "${ROOT_DIR}/backend/node_modules" ]] || fail "backend/node_modules missing after host build"
  log "Build frontend on host..."
  (cd "${ROOT_DIR}/frontend" && npm ci && npm run build -- --configuration=production)
}

# node_modules is in .dockerignore by default; production image needs it from host
allow_backend_node_modules_in_docker() {
  local ignore="${ROOT_DIR}/backend/.dockerignore"
  [[ -f "$ignore" ]] || return 0
  grep -qx 'node_modules' "$ignore" || return 0
  BACKEND_DOCKERIGNORE_BAK="${ignore}.deploybak"
  cp "$ignore" "$BACKEND_DOCKERIGNORE_BAK"
  grep -vx 'node_modules' "$ignore" > "${ignore}.tmp" && mv "${ignore}.tmp" "$ignore"
}

restore_backend_dockerignore() {
  local ignore="${ROOT_DIR}/backend/.dockerignore"
  [[ -n "$BACKEND_DOCKERIGNORE_BAK" && -f "$BACKEND_DOCKERIGNORE_BAK" ]] || return 0
  mv "$BACKEND_DOCKERIGNORE_BAK" "$ignore"
  BACKEND_DOCKERIGNORE_BAK=""
}

deploy() {
  require_env
  build_on_host
  allow_backend_node_modules_in_docker
  trap restore_backend_dockerignore EXIT
  log "Docker build & start..."
  "${COMPOSE[@]}" up -d --build --force-recreate
  restore_backend_dockerignore
  trap - EXIT
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

  local backend_health
  backend_health=$("${COMPOSE[@]}" exec -T backend node -e \
    "require('http').get('http://127.0.0.1:3000/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{process.stdout.write(d);process.exit(r.statusCode===200?0:1)})}).on('error',()=>process.exit(1))") \
    || fail "Backend unhealthy (container not responding on :3000/health)"
  echo "$backend_health" | grep -q '"database":"connected"' \
    || fail "Backend DB not connected: ${backend_health}"

  local port="${HTTP_PORT:-80}" url="http://127.0.0.1:${port}/api/health" via_nginx=""
  if command -v curl >/dev/null 2>&1; then
    via_nginx=$(curl -sf "$url" 2>/dev/null) || true
  elif command -v wget >/dev/null 2>&1; then
    via_nginx=$(wget -qO- "$url" 2>/dev/null) || true
  fi
  if [[ -n "$via_nginx" ]]; then
    echo "$via_nginx" | grep -q '"database":"connected"' \
      || fail "Edge nginx unhealthy at ${url} — run: ${COMPOSE[*]} logs nginx"
  else
    log "Note: install curl on VM to verify edge nginx (/api/health)"
  fi

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
