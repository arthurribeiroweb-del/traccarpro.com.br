#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/traccarpro.com.br/portal}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/traccarpro/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
SCHEDULE="${SCHEDULE:-17 3 * * *}"
CRON_FILE="/etc/cron.d/traccarpro-portal-backup"
LOG_FILE="/var/log/traccarpro-postgres-backup.log"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash $0"
  exit 1
fi

chmod +x "${APP_DIR}/scripts/postgres-backup.sh"
mkdir -p "${BACKUP_DIR}"
touch "${LOG_FILE}"
chmod 600 "${LOG_FILE}"

cat > "${CRON_FILE}" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

${SCHEDULE} root APP_DIR=${APP_DIR} BACKUP_DIR=${BACKUP_DIR} RETENTION_DAYS=${RETENTION_DAYS} ${APP_DIR}/scripts/postgres-backup.sh >> ${LOG_FILE} 2>&1
EOF

chmod 644 "${CRON_FILE}"
echo "Cron instalado em ${CRON_FILE}"
echo "Para testar agora: APP_DIR=${APP_DIR} BACKUP_DIR=${BACKUP_DIR} ${APP_DIR}/scripts/postgres-backup.sh"

