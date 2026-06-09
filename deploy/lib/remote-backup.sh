#!/usr/bin/env bash
# Pull production backups from server to Mac

require_remote_backup_config() {
  require_root_dir
  [[ -f .env ]] || fail ".env not found"
  # shellcheck disable=SC1091
  source .env

  [[ -n "${LDS_SERVER_HOST:-}" ]] || fail "Set LDS_SERVER_HOST in .env (server IP)"
  [[ -n "${LDS_SSH_KEY:-}" ]] || fail "Set LDS_SSH_KEY in .env (path to SSH private key)"
  [[ -f "${LDS_SSH_KEY}" ]] || fail "SSH key not found: ${LDS_SSH_KEY}"

  LDS_SSH_USER="${LDS_SSH_USER:-root}"
  LDS_REMOTE_DIR="${LDS_REMOTE_DIR:-/opt/lds}"
  LDS_MAC_BACKUP_DIR="${LDS_MAC_BACKUP_DIR:-${ROOT_DIR}/backups-from-server}"
}

remote_ssh() {
  ssh -i "${LDS_SSH_KEY}" -o StrictHostKeyChecking=accept-new \
    "${LDS_SSH_USER}@${LDS_SERVER_HOST}" "$@"
}

pull_backups_from_server() {
  require_remote_backup_config
  mkdir -p "${LDS_MAC_BACKUP_DIR}"

  log "Pulling backups from ${LDS_SSH_USER}@${LDS_SERVER_HOST}:${LDS_REMOTE_DIR}/backups/"
  log "Saving to ${LDS_MAC_BACKUP_DIR}/"

  if command -v rsync >/dev/null 2>&1; then
    rsync -avz --progress \
      -e "ssh -i ${LDS_SSH_KEY} -o StrictHostKeyChecking=accept-new" \
      "${LDS_SSH_USER}@${LDS_SERVER_HOST}:${LDS_REMOTE_DIR}/backups/" \
      "${LDS_MAC_BACKUP_DIR}/"
  else
    scp -i "${LDS_SSH_KEY}" -r \
      "${LDS_SSH_USER}@${LDS_SERVER_HOST}:${LDS_REMOTE_DIR}/backups/." \
      "${LDS_MAC_BACKUP_DIR}/"
  fi

  log "Backups on your Mac:"
  ls -lh "${LDS_MAC_BACKUP_DIR}" | tail -10
  du -sh "${LDS_MAC_BACKUP_DIR}"
}

sync_backup_from_server() {
  require_remote_backup_config

  log "Step 1/2 — full backup on server..."
  remote_ssh "cd ${LDS_REMOTE_DIR} && ./deploy/production.sh backup"

  log "Step 2/2 — copy to Mac..."
  pull_backups_from_server
}
