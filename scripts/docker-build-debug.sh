#!/bin/sh
# Сборка образа с выводом полного лога (чтобы увидеть ошибку npm run build).
# Запуск: ./scripts/docker-build-debug.sh   или   bash scripts/docker-build-debug.sh
set -e
docker build --no-cache --progress=plain 2>&1 | tee docker-build.log
echo "Лог сохранён в docker-build.log"
