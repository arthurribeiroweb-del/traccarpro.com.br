#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-portal}"
APP_DIR="${APP_DIR:-/root/traccarpro.com.br/portal}"
STATE_FILE="${STATE_FILE:-/var/lib/traccarpro/portal-monitor.state}"
SCHEDULE="${SCHEDULE:-*/2 * * * *}"
CRON_FILE="/etc/cron.d/traccarpro-portal-monitor"
LOG_FILE="/var/log/traccarpro-portal-monitor.log"
ENV_FILE="/etc/default/traccarpro-portal-monitor"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash $0"
  exit 1
fi

chmod +x "${APP_DIR}/scripts/monitor-pm2-portal.sh"
mkdir -p "$(dirname "${STATE_FILE}")"
touch "${LOG_FILE}"
chmod 600 "${LOG_FILE}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat > "${ENV_FILE}" <<EOF
# URL opcional de webhook (Slack, Discord, etc) para alertas.
# ALERT_WEBHOOK_URL="https://seu-webhook"
EOF
  chmod 600 "${ENV_FILE}"
fi

cat > "${CRON_FILE}" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

${SCHEDULE} root APP_NAME=${APP_NAME} APP_DIR=${APP_DIR} STATE_FILE=${STATE_FILE} ENV_FILE=${ENV_FILE} ${APP_DIR}/scripts/monitor-pm2-portal.sh >> ${LOG_FILE} 2>&1
EOF

chmod 644 "${CRON_FILE}"
echo "Cron de monitor instalado em ${CRON_FILE}"
echo "Arquivo de configuracao de alerta: ${ENV_FILE}"
echo "Para testar agora: APP_NAME=${APP_NAME} APP_DIR=${APP_DIR} STATE_FILE=${STATE_FILE} ENV_FILE=${ENV_FILE} ${APP_DIR}/scripts/monitor-pm2-portal.sh"

