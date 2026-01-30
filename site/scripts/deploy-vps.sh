#!/bin/bash
# Deploy do site institucional (landing) para a VPS
# Uso: rodar na sua máquina local (com npm/node), depois subir arquivos ou rodar na VPS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$SITE_DIR/dist"

echo "=== Build do site Astro ==="
cd "$SITE_DIR"
npm run build

if [ ! -d "$DIST_DIR" ]; then
  echo "Erro: pasta dist/ não foi gerada."
  exit 1
fi

echo ""
echo "=== Build concluído ==="
echo "Pasta: $DIST_DIR"
echo ""
echo "Próximos passos para subir na VPS:"
echo ""
echo "1. Na sua máquina (PowerShell/CMD):"
echo "   scp -r $DIST_DIR/* usuario@seu-servidor:/var/www/traccarpro-landing/"
echo ""
echo "2. Ou usar rsync:"
echo "   rsync -avz --delete $DIST_DIR/ usuario@seu-servidor:/var/www/traccarpro-landing/"
echo ""
echo "3. Na VPS, crie a pasta se não existir:"
echo "   sudo mkdir -p /var/www/traccarpro-landing"
echo "   sudo chown \$(whoami):\$(whoami) /var/www/traccarpro-landing"
echo ""
