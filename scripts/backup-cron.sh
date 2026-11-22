#!/usr/bin/env bash
# ==============================================================================
# PayProof POS - Production Daily Database Backup Script
# Automatically dumps, compresses, and rotates backups (14-day retention).
# Recommended crontab: 0 2 * * * /path/to/payproof/scripts/backup-cron.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/var/backups/payproof"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/payproof_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup at $(date)..."

# Source production environment if present
if [ -f "$(dirname "$0")/../.env.production" ]; then
    set -a
    source "$(dirname "$0")/../.env.production"
    set +a
fi

DB_USER="${POSTGRES_USER:-payproof_admin}"
DB_NAME="${POSTGRES_DB:-payproof_prod}"
CONTAINER_NAME="payproof-postgres-prod"

# Dump database through docker exec and compress with gzip
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"

echo "[SUCCESS] Backup written to: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention: Delete backups older than 14 days
echo "[INFO] Cleaning backups older than 14 days..."
find "${BACKUP_DIR}" -type f -name "payproof_backup_*.sql.gz" -mtime +14 -delete

echo "[INFO] Backup rotation complete."
