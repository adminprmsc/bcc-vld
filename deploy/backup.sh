#!/usr/bin/env bash
# Backup MySQL database and uploaded files
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$BACKUP_DIR/$TIMESTAMP"

mkdir -p "$DEST"

# shellcheck disable=SC1091
source .env

echo "Backing up MySQL to $DEST/mysql.sql.gz ..."
docker compose exec -T mysql mysqldump \
  -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" \
  --single-transaction --routines --triggers \
  "${MYSQL_DATABASE}" | gzip > "$DEST/mysql.sql.gz"

echo "Backing up uploads ..."
docker compose exec -T backend tar czf - -C /app/uploads . > "$DEST/uploads.tar.gz"

echo "Backup complete: $DEST"
ls -lh "$DEST"
