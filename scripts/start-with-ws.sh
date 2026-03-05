#!/bin/sh
# Запуск: Next.js на 3001, прокси+WebSocket на 3000

set -e
cd /app

# Применяем миграции
prisma migrate deploy 2>/dev/null || true

# Next.js в фоне на 3001
PORT=3001 node server.js &
NEXT_PID=$!

# Ждём готовности Next.js
sleep 3

# Прокси+WS на 3000 (основной порт)
exec node scripts/proxy-ws-server.cjs
