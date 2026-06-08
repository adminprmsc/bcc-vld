#!/usr/bin/env bash
# LDS production deployment script for Nayatel / VPS hosts
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}==>${NC} $*"; }
fail() { echo -e "${RED}==> ERROR:${NC} $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "Docker is not installed. See DEPLOYMENT.md"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required (docker compose)"

if [[ ! -f .env ]]; then
  warn ".env not found — copying from .env.example"
  cp .env.example .env
  fail "Edit .env with real secrets (JWT_SECRET, MYSQL passwords, ALLOWED_ORIGINS), then re-run."
fi

# shellcheck disable=SC1091
source .env

[[ -n "${JWT_SECRET:-}" && "${JWT_SECRET}" != *"GENERATE"* ]] || fail "Set JWT_SECRET in .env"
[[ -n "${MYSQL_ROOT_PASSWORD:-}" && "${MYSQL_ROOT_PASSWORD}" != *"GENERATE"* ]] || fail "Set MYSQL_ROOT_PASSWORD in .env"
[[ -n "${MYSQL_PASSWORD:-}" && "${MYSQL_PASSWORD}" != *"GENERATE"* ]] || fail "Set MYSQL_PASSWORD in .env"

log "Building and starting LDS stack..."
docker compose up -d --build

log "Waiting for services to become healthy..."
sleep 15

BACKEND_HEALTH=$(docker compose exec -T backend node -e "require('http').get('http://localhost:3000/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(r.statusCode===200?0:1))}).on('error',()=>process.exit(1))" && echo ok || echo fail)
NGINX_HEALTH=$(curl -sf "http://localhost:${HTTP_PORT:-80}/health" >/dev/null && echo ok || echo fail)

if [[ "$BACKEND_HEALTH" == "ok" && "$NGINX_HEALTH" == "ok" ]]; then
  log "Deployment successful!"
  log "App URL:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_SERVER_IP')"
  log "Health:   curl http://localhost:${HTTP_PORT:-80}/health"
  log "API:      curl http://localhost:${HTTP_PORT:-80}/api/health"
else
  warn "Stack started but health checks did not all pass yet."
  warn "Run: docker compose ps && docker compose logs -f"
fi

log "Useful commands:"
echo "  docker compose ps"
echo "  docker compose logs -f backend"
echo "  docker compose logs -f nginx"
echo "  ./deploy/backup.sh"
