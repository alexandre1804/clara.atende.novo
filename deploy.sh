#!/bin/bash
set -e

ROOT="/root/clara.atende.novo"

echo "==> Atualizando código..."
cd "$ROOT"
git pull origin main

echo "==> Build do Next.js..."
cd "$ROOT/lorvix"
npm install --omit=dev
npm run build

echo "==> Reiniciando Next.js com PM2..."
pm2 describe lorvix > /dev/null 2>&1 \
  && pm2 restart lorvix \
  || pm2 start ecosystem.config.js

pm2 save

echo "==> Deploy concluído!"
pm2 status
