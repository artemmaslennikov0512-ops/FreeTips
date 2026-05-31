#!/usr/bin/env bash
# На сервере после git pull: убрать APP_APK_* из .env, пересобрать контейнер, проверить /api/app/version.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash scripts/strip-apk-env-vars.sh .env

echo "=== app-version.json (репозиторий) ==="
cat public/app-version.json
echo
echo "=== freetips.apk ==="
ls -la public/freetips.apk

node scripts/verify-apk-sync.mjs

echo "=== docker compose build & up ==="
docker compose up -d --build

echo "=== prisma migrate deploy ==="
docker compose exec -T web npx prisma migrate deploy

echo "=== ожидание web ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:3000/api/app/version" >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo "=== /api/app/version (localhost) ==="
curl -s "http://127.0.0.1:3000/api/app/version" | python3 -m json.tool || curl -s "http://127.0.0.1:3000/api/app/version"

echo
echo "=== /api/app/version (public) ==="
curl -s "https://free-tips.ru/api/app/version" | python3 -m json.tool || curl -s "https://free-tips.ru/api/app/version"

echo
echo "Готово. Убедитесь: versionCode совпадает с app-version.json и build.gradle.kts."
