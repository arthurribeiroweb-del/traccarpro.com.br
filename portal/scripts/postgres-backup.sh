#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/root/traccarpro.com.br/portal}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/traccarpro/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    echo "ERRO: DATABASE_URL nao definido e ${APP_DIR}/.env nao encontrado."
    exit 1
  fi

  DATABASE_URL="$(
    node -e "const fs=require('fs');
const env=fs.readFileSync(process.argv[1],'utf8').split(/\r?\n/);
const row=env.find((line)=>line.startsWith('DATABASE_URL='));
if(!row){process.exit(1);}
let value=row.slice('DATABASE_URL='.length).trim();
if((value.startsWith('\"') && value.endsWith('\"')) || (value.startsWith(\"'\") && value.endsWith(\"'\"))){
  value=value.slice(1,-1);
}
process.stdout.write(value);" "${APP_DIR}/.env"
  )" || {
    echo "ERRO: Nao foi possivel ler DATABASE_URL de ${APP_DIR}/.env"
    exit 1
  }
fi

mkdir -p "${BACKUP_DIR}"
umask 077

timestamp="$(date -u +'%Y%m%d_%H%M%S')"
backup_file="${BACKUP_DIR}/traccarpro_portal_${timestamp}.sql.gz"

pg_dump "${DATABASE_URL}" --no-owner --no-privileges | gzip -9 > "${backup_file}"
sha256sum "${backup_file}" > "${backup_file}.sha256"

ln -sfn "$(basename "${backup_file}")" "${BACKUP_DIR}/latest.sql.gz"
ln -sfn "$(basename "${backup_file}.sha256")" "${BACKUP_DIR}/latest.sql.gz.sha256"

find "${BACKUP_DIR}" -type f -name 'traccarpro_portal_*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name 'traccarpro_portal_*.sql.gz.sha256' -mtime +"${RETENTION_DAYS}" -delete

echo "Backup concluido: ${backup_file}"

