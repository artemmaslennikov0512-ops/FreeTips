#!/usr/bin/env bash
# Удаляет устаревшие APP_APK_* из .env на сервере (источник версии — public/app-version.json).
set -euo pipefail
ENV_FILE="${1:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Файл $ENV_FILE не найден"
  exit 1
fi
if grep -q '^APP_APK_' "$ENV_FILE" 2>/dev/null; then
  cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  grep -v '^APP_APK_' "$ENV_FILE" > "${ENV_FILE}.tmp" && mv "${ENV_FILE}.tmp" "$ENV_FILE"
  echo "Удалены APP_APK_* из $ENV_FILE (бэкап сохранён)"
else
  echo "APP_APK_* в $ENV_FILE не найдены — OK"
fi
