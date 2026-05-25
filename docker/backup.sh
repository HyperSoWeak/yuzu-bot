#!/bin/sh
# Daily PostgreSQL backup with 7-day retention.
# Runs inside the `backup` service; writes to /backups (host-mounted).
# Optionally uploads to Google Drive when /config/rclone/rclone.conf is present.

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
GDRIVE_PATH="${GDRIVE_PATH:-yuzu-backups}"
TIMESTAMP="$(date -u +'%Y%m%d-%H%M%S')"
OUT="${BACKUP_DIR}/yuzu-${TIMESTAMP}.sql.gz"
RCLONE_CONF="/config/rclone/rclone.conf"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup start -> ${OUT}"
pg_dump --no-owner --no-privileges --format=plain | gzip -9 > "$OUT"
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup done $(du -h "$OUT" | cut -f1)"

# Prune older than retention.
find "$BACKUP_DIR" -maxdepth 1 -name 'yuzu-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete

# Upload to Google Drive if rclone gdrive remote is configured.
if ! rclone listremotes --config "$RCLONE_CONF" 2>/dev/null | grep -q "^gdrive:"; then
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] WARNING: gdrive remote not configured in ${RCLONE_CONF}, skipping Google Drive upload"
else
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] uploading to gdrive:${GDRIVE_PATH}/"
  rclone copy "$OUT" "gdrive:${GDRIVE_PATH}/" --config "$RCLONE_CONF"
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] upload done"
fi
