# Операционное руководство (runbook)

Краткий чеклист для деплоя и эксплуатации приложения.

## Переменные окружения

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `JWT_SECRET` | да | Секрет для access JWT. Генерация: `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | да | Секрет для refresh JWT. Генерация: `openssl rand -base64 32` |
| `DATABASE_URL` | да (или POSTGRES_*) | PostgreSQL connection string |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | для docker-compose | Используются для подстановки `DATABASE_URL` в контейнере `web` |
| `NODE_ENV` | нет | `production` — скрытие деталей в 500, только error-логи Prisma |
| `NEXT_PUBLIC_APP_URL` | в проде за прокси | Публичный URL приложения (для ссылок/QR, если origin искажён) |
| `PAYMENT_API_KEY` | для реального провайдера | Ключ API платёжного шлюза |
| `PAYMENT_WEBHOOK_SECRET` | в проде при реальном провайдере | Секрет для проверки подписи вебхука (HMAC-SHA256) |
| `SUPERADMIN_LOGIN`, `SUPERADMIN_PASSWORD` | для seed | Логин/пароль первого суперадмина (при первом входе — смена пароля обязательна) |

## Перед деплоем

1. Убедиться, что `JWT_SECRET` и `JWT_REFRESH_SECRET` заданы и не совпадают.
2. В production задать `NODE_ENV=production`.
3. При использовании реального платёжного провайдера задать `PAYMENT_WEBHOOK_SECRET`.
4. Приложение рассчитано на stateless-режим (сессии в БД, JWT в cookie); при горизонтальном масштабировании rate limit по IP — in-memory (при нескольких инстансах рассмотреть внешний store).

## БД

- Схема применяется через `prisma db push` при старте контейнера (см. Dockerfile/entrypoint) или вручную: `prisma migrate deploy` / `prisma db push`.
- Первый суперадмин: `npx prisma db seed` или `npx tsx prisma/seed.ts` (значения из `SUPERADMIN_LOGIN` / `SUPERADMIN_PASSWORD`).

## Безопасность

- Все ответы 500 в production возвращают только общее сообщение (без стека и внутренних деталей).
- Размер тела запроса ограничен: auth/регистрация — 512 KB, остальные JSON POST — 1 MB (413 при превышении).
- Rate limit: auth и заявки на регистрацию ограничены по IP; при необходимости — увеличить лимиты или вынести в Redis.

## Логи и мониторинг

- Структурированное логирование через `lib/logger.ts` (логи безопасности и ошибок с контекстом).
- Рекомендуется собирать метрики по 4xx/5xx и по событиям `auth.login.*`, `pay.init.*`, `payment.webhook.*`.

## Откат

- Откат — развёртывание предыдущей версии образа/артефакта. Миграции БД при откате должны быть обратно совместимы (не удалять колонки без отдельного окна миграции).

## Health check

- `GET /api/health` — проверка доступности приложения и БД. Ответ 200 при `status: "ok"`, 503 при недоступности БД.
- Рекомендуется использовать для load balancer и мониторинга (Prometheus, UptimeRobot и т.д.).

## Инциденты

### БД недоступна (503 на /api/health)

1. Проверить логи контейнера `web`: `docker compose logs web`.
2. Проверить состояние контейнера `db`: `docker compose ps db`.
3. Подключиться к PostgreSQL: `docker compose exec db psql -U app -d tips -c "SELECT 1"`.
4. При необходимости перезапуск: `docker compose restart db` (данные сохраняются в томе `pgdata`).

### Webhook платёжного провайдера не приходит / отклоняется

1. Проверить `PAYMENT_WEBHOOK_SECRET` — задан ли в production.
2. Проверить логи: `logSecurity("payment.webhook.invalid_signature")` — неверная подпись.
3. Проверить rate limit: `logSecurity("payment.webhook.rate_limit")` — временная блокировка (60/мин по IP).
4. Убедиться, что URL webhook в настройках провайдера совпадает с продакшен-доменом.

### Массовые 500

1. Собрать логи: `docker compose logs web --tail 500`.
2. Проверить метрики: память, CPU контейнера.
3. Проверить БД: свободное место, количество подключений.
4. При необходимости перезапуск: `docker compose restart web`.

### Rate limit на pay (429)

- Срабатывает при >60 запросов с одного IP за 15 мин или >30 на один slug.
- Это ожидаемое антифрод-поведение. При легитимной нагрузке — рассмотреть увеличение лимитов в `lib/middleware/rate-limit.ts`.
