#!/bin/sh
# Daily PostgreSQL backup with 7-day retention.
# Runs inside the `backup` service; writes to /backups (host-mounted).
# Optionally uploads to Google Drive when /config/rclone/rclone.conf is present.
# Optionally sends a Discord notification when DISCORD_NOTIFY_CHANNEL_ID and DISCORD_TOKEN are set.

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
GDRIVE_PATH="${GDRIVE_PATH:-yuzu-backups}"
TIMESTAMP="$(date -u +'%Y%m%d-%H%M%S')"
OUT="${BACKUP_DIR}/yuzu-${TIMESTAMP}.sql.gz"
RCLONE_CONF="/config/rclone/rclone.conf"

_discord_notify() {
  if [ -z "${DISCORD_NOTIFY_CHANNEL_ID:-}" ] || [ -z "${DISCORD_TOKEN:-}" ]; then
    return 0
  fi
  curl -s -o /dev/null -X POST \
    -H "Authorization: Bot ${DISCORD_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"$1\"}" \
    "https://discord.com/api/v10/channels/${DISCORD_NOTIFY_CHANNEL_ID}/messages" || true
}

trap '_discord_notify "[backup] failed — check host logs"' ERR

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup start -> ${OUT}"
pg_dump --no-owner --no-privileges --format=plain | gzip -9 > "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup done ${SIZE}"

# Prune older than retention.
find "$BACKUP_DIR" -maxdepth 1 -name 'yuzu-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete

# Upload to Google Drive if rclone gdrive remote is configured.
GDRIVE_STATUS="local only"
if ! rclone listremotes --config "$RCLONE_CONF" 2>/dev/null | grep -q "^gdrive:"; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] WARNING: gdrive remote not configured in ${RCLONE_CONF}, skipping Google Drive upload"
else
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] uploading to gdrive:${GDRIVE_PATH}/"
  rclone copy "$OUT" "gdrive:${GDRIVE_PATH}/" --config "$RCLONE_CONF"
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] upload done"
  GDRIVE_STATUS="+ gdrive:${GDRIVE_PATH}"
fi

trap - ERR
_discord_notify "[backup] \`$(basename "$OUT")\` (${SIZE}) — ${GDRIVE_STATUS}"
