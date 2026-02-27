#!/bin/sh
# Обновление на сервере без замены папки: пересборка и перезапуск контейнеров.
# Запуск из корня проекта: ./scripts/deploy-update.sh
# Или из scripts/: cd .. && ./scripts/deploy-update.sh

set -e

# Переход в корень проекта (каталог с docker-compose.yml)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! [ -f docker-compose.yml ]; then
  echo "Ошибка: docker-compose.yml не найден в $ROOT"
  exit 1
fi

echo "Обновление в $ROOT..."
docker compose up -d --build
echo "Готово. Проверь: docker compose ps"
