#!/bin/bash
# Deploy do Portal TraccarPro (cadastro, admin, assinatura) na VPS
# Uso: cd /opt/traccarpro-portal-src && git pull && bash scripts/deploy-vps-portal.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Deploy Portal TraccarPro ==="
echo "Diretório: $PORTAL_DIR"
echo ""

cd "$PORTAL_DIR"

echo ">>> npm install"
npm install

echo ">>> Prisma generate"
npx prisma generate

echo ">>> Limpando cache e Build (força rebuild completo)"
rm -rf .next
npm run build

echo ">>> Garantir pasta uploads com permissões"
mkdir -p "$PORTAL_DIR/uploads"
chmod 755 "$PORTAL_DIR/uploads"

echo ">>> PM2 restart portal"
pm2 restart portal 2>/dev/null || pm2 start npm --name "portal" -- start

pm2 save

echo ""
echo "=== Deploy concluído ==="
echo "Portal reiniciado. Verifique: pm2 logs portal"
echo ""
