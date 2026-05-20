#!/bin/sh
# Daily PostgreSQL backup with 7-day retention.
# Runs inside the `backup` service; writes to /backups (host-mounted).

set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP="$(date -u +'%Y%m%d-%H%M%S')"
OUT="${BACKUP_DIR}/yuzu-${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup start -> ${OUT}"
pg_dump --no-owner --no-privileges --format=plain | gzip -9 > "$OUT"
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] backup done $(du -h "$OUT" | cut -f1)"

# Prune older than retention.
find "$BACKUP_DIR" -maxdepth 1 -name 'yuzu-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -print -delete
