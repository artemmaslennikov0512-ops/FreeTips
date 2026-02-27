# Чаевые — приём безналичных чаевых

Платформа для приёма чаевых картой, по ссылке или QR-коду. Аналог 1tips.ru с новым дизайном.

> **Контекст для разработки:** [docs/PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) — что сделано, текущее состояние, следующие шаги. [TODO.md](./TODO.md) — задачи.

## Стек

- **Next.js 16** (App Router), **TypeScript**, **Tailwind CSS v4**, **Lucide**
- **Prisma** (ORM), **PostgreSQL** (БД)
- **Docker** — запуск только через контейнеры, `npm` на хосте не нужен

См. [STACK.md](./STACK.md).

## Установка и запуск

1. **Скопируй `.env.example` в `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Заполни в `.env` обязательно:**
   - `JWT_SECRET` и `JWT_REFRESH_SECRET` — сгенерируй: `openssl rand -base64 32` (каждый отдельно)
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — при необходимости (значения по умолчанию в `docker-compose`)

3. **Запуск:**
   ```bash
   docker compose up --build
   ```

   - Приложение: [http://localhost:3000](http://localhost:3000)
   - PostgreSQL: порт `5432` (хост `db` внутри compose)

4. **БД:** Схема применяется при старте контейнера `web` (`prisma db push`). Миграции вручную:
   ```bash
   docker compose run --rm web sh -c "prisma migrate dev --name <имя>"
   ```

5. **Создание первого суперадмина (seed):**
   ```bash
   docker compose exec web sh -c "npx tsx prisma/seed.ts"
   ```
   Или через Prisma:
   ```bash
   docker compose exec web sh -c "npx prisma db seed"
   ```
   
   Логин и пароль суперадмина задаются в `.env`:
   - `SUPERADMIN_LOGIN` (по умолчанию: `superadmin`)
   - `SUPERADMIN_PASSWORD` (по умолчанию: `ChangeMe123!`)
   
   ⚠️ **Важно:** При первом входе суперадмин обязан сменить пароль.

## Структура

- `app/` — страницы: `/` (лендинг), `/login`, `/register`, `/cabinet` (профиль, ссылка, история, вывод), `/admin` (дашборд, выводы, пользователи, создание админа), `/pay/[slug]`, `/oferta`, `/politika`, `/kontakty`, `/change-password`, `/forgot-password`
- `app/api/` — auth, profile, links, transactions, payouts, pay/[slug], payment/webhook, admin (stats, payouts, users)
- `components/` — Header, Footer, секции лендинга
- `config/site.ts` — навигация, футер, реквизиты
- `lib/` — `db`, `validations`, `utils`, `balance`, `get-base-url`, `generate-slug`, `auth/`, `middleware/`, `payment/` (интерфейс PaymentGateway, заглушка StubPaymentGateway), `api/helpers` (лимит тела, единый формат ошибок), `ports/` (IUserRepository), `infrastructure/` (PrismaUserRepository)
- `prisma/` — схема БД
- `docs/API.md` — описание API

## Переменные окружения (.env)

| Переменная | Обязательно | Описание |
|------------|-------------|----------|
| `JWT_SECRET` | да | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | да | `openssl rand -base64 32` |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | для docker-compose | По умолчанию: app, changeme, tips |
| `NEXT_PUBLIC_APP_URL` | нет | Публичный URL для ссылок/QR в проде (если иной, чем origin) |
| `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | нет | Для реального платёжного провайдера (пока заглушка) |
| `SUPERADMIN_LOGIN` | нет | Логин для первого суперадмина (seed), по умолчанию: `superadmin` |
| `SUPERADMIN_PASSWORD` | нет | Пароль для первого суперадмина (seed), по умолчанию: `ChangeMe123!` |
`DATABASE_URL` в `.env` не задавать — в `web` подставляется из `POSTGRES_*` и хоста `db`.

## Данные для подстановки

- **Футер и документы:** реквизиты, контакты, URL — в [FOOTER_DATA.placeholder.md](./FOOTER_DATA.placeholder.md). После заполнения — перенести в `config/site.ts`.
- **Тексты оферты и политики** — заменить плейсхолдеры в `app/oferta/page.tsx` и `app/politika/page.tsx`.

## API

Документация: [docs/API.md](./docs/API.md).

**Auth (публичные):**  
`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`

**С авторизацией (Bearer):**  
`GET/PATCH /api/profile`, `POST /api/profile/change-password`, `GET/POST /api/links`, `GET /api/transactions`, `GET/POST /api/payouts`

**Админка (требует роль ADMIN или SUPERADMIN):**  
`GET /api/admin/stats`, `GET /api/admin/payouts`, `PATCH /api/admin/payouts/[id]`, `GET /api/admin/users`, `POST /api/admin/users` (только SUPERADMIN)

**Платёжная страница (публичные):**  
`GET /api/pay/[slug]` — данные получателя; `POST /api/pay/[slug]` — инициализация (заглушка: сразу SUCCESS)

**Вебхук (для провайдера):**  
`POST /api/payment/webhook` — приём уведомлений (заглушка: всегда 200)

**Безопасность:** JWT access (15 мин) в `Authorization: Bearer <token>`, refresh (7 дней) в httpOnly cookie, rate limiting, валидация Zod.

## Адаптив

Вёрстка mobile-first. На мобильных навигация открывается в боковом меню (слайд-панель справа).

## Выкладка в интернет

Инструкция: **[DEPLOY.md](./DEPLOY.md)** — как выложить сайт и продолжать редактировать в Cursor без ручной замены папки на сервере (Git + скрипт обновления или Cursor Remote SSH).

## Документация

| Файл | Назначение |
|------|------------|
| [DEPLOY.md](DEPLOY.md) | Деплой в интернет, обновление без замены папки, Remote SSH |
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Контекст для разработки: что сделано, состояние, следующие шаги |
| [docs/ARCHITECTURE_ASSESSMENT.md](docs/ARCHITECTURE_ASSESSMENT.md) | Оценка архитектуры (Hexagonal/DDD), направление развития |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Операционное руководство: env, деплой, безопасность, откат |
| [TODO.md](TODO.md) | Задачи по статусам и приоритетам |
| [docs/API.md](docs/API.md) | Описание API (auth: register, login, refresh, logout) |
| [docs/API_CONTRACT_1TIPS.md](docs/API_CONTRACT_1TIPS.md) | Контракт для приложения FreeTips (operations, push/register) |
| [STACK.md](STACK.md) | Стек и структура проекта |
| [QUICK_START.md](QUICK_START.md) | Запуск и проверка auth |
| [PROMPT.md](PROMPT.md) | Исходный промпт и требования (реализация auth упрощена: логин без SMS) |
