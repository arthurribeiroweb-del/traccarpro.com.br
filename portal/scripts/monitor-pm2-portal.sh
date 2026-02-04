#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-portal}"
APP_DIR="${APP_DIR:-/root/traccarpro.com.br/portal}"
STATE_FILE="${STATE_FILE:-/var/lib/traccarpro/portal-monitor.state}"
RESTART_ALERT_THRESHOLD="${RESTART_ALERT_THRESHOLD:-3}"
ENV_FILE="${ENV_FILE:-/etc/default/traccarpro-portal-monitor}"

if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
fi

alert() {
  local message="$1"
  echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') ${message}"

  if [[ -n "${ALERT_WEBHOOK_URL:-}" ]]; then
    local payload
    payload="$(node -e "console.log(JSON.stringify({text: process.argv[1]}));" "${message}")"
    curl -fsS -m 10 -H 'Content-Type: application/json' -d "${payload}" "${ALERT_WEBHOOK_URL}" >/dev/null || true
  fi
}

if ! command -v pm2 >/dev/null 2>&1; then
  alert "PM2 nao encontrado no PATH."
  exit 1
fi

mkdir -p "$(dirname "${STATE_FILE}")"

status_row="$(
  pm2 jlist | node -e "let input='';process.stdin.on('data',d=>input+=d);process.stdin.on('end',()=>{try{const list=JSON.parse(input);const app=list.find((item)=>item.name===process.argv[1]);if(!app){console.log('0 MISSING 0');return;}const status=app.pm2_env?.status||'unknown';const restarts=String(app.pm2_env?.restart_time||0);console.log(['1',status,restarts].join(' '));}catch{console.log('0 PARSE_ERROR 0');}});" "${APP_NAME}"
)"

read -r exists status restarts <<< "${status_row}"

if [[ "${exists}" != "1" ]]; then
  alert "App ${APP_NAME} nao encontrada no PM2. Tentando iniciar."
  if (cd "${APP_DIR}" && pm2 start npm --name "${APP_NAME}" -- start >/dev/null 2>&1); then
    alert "App ${APP_NAME} iniciada automaticamente."
  else
    alert "Falha ao iniciar app ${APP_NAME} automaticamente."
    exit 1
  fi
  exit 0
fi

if [[ "${status}" != "online" ]]; then
  alert "App ${APP_NAME} com status ${status}. Tentando restart."
  if pm2 restart "${APP_NAME}" >/dev/null 2>&1; then
    alert "App ${APP_NAME} reiniciada automaticamente."
  else
    alert "Falha ao reiniciar app ${APP_NAME}."
    exit 1
  fi
fi

previous_restarts="0"
if [[ -f "${STATE_FILE}" ]]; then
  previous_restarts="$(cat "${STATE_FILE}" 2>/dev/null || echo 0)"
fi

if [[ "${restarts}" =~ ^[0-9]+$ && "${previous_restarts}" =~ ^[0-9]+$ ]]; then
  if (( restarts > previous_restarts )); then
    delta=$((restarts - previous_restarts))
    if (( delta >= RESTART_ALERT_THRESHOLD )); then
      alert "App ${APP_NAME} reiniciou ${delta} vez(es) desde a ultima checagem."
    fi
  fi
fi

echo "${restarts}" > "${STATE_FILE}"

