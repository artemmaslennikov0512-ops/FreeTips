# Статус проекта и контекст для передачи в другой чат

> **Цель файла:** дать новому чату/разработчику полную картину: что за проект, что уже сделано, как устроено, что делать дальше.

---

## 1. Что за проект

**Платформа безналичных чаевых** (аналог 1tips.ru): получатель (официант, курьер, мастер) получает уникальную ссылку и QR; гость переходит по ссылке, выбирает сумму, платит картой — без регистрации. Деньги зачисляются получателю.

- **Стек:** Next.js 16 (App Router), TypeScript, Tailwind v4, Prisma, PostgreSQL, Docker.
- **Документация:** [README.md](../README.md), [STACK.md](../STACK.md), [PROMPT.md](../PROMPT.md), [TODO.md](../TODO.md), [docs/API.md](./API.md).

---

## 2. Что сделано в последней сессии (2025-01-24)

### 2.1 Убран контейнер `dev`

- **Было:** `docker compose --profile dev up dev` и `watch dev` для hot reload.
- **Стало:** запуск только через Docker: `docker compose up --build`. Сервисы `web` и `db`. При старте `web` выполняется `prisma db push`, затем `node server.js`.

### 2.2 Auth: логин вместо телефона, без SMS

**Регистрация**

- **Убрано:** телефон, имя, шаг «подтверждение по SMS» (`/api/auth/confirm` удалён).
- **Добавлено:** логин (уникальный), подтверждение пароля. Email по желанию.
- **Сейчас:** одна форма: логин, email (опц.), пароль, подтверждение пароля → `POST /api/auth/register` → создание пользователя и выдача токенов, редирект в `/cabinet`. Без SMS.

**Вход**

- **Было:** телефон + пароль.
- **Стало:** логин + пароль → `POST /api/auth/login`.

**БД (User)**

- **Убрано:** `phone`, `name`.
- **Добавлено:** `login` (unique, 3–50 символов: латиница, цифры, `_`).

**Валидация (Zod)**

- `loginSchema` — формат логина.
- `registerSchema` — login, password, passwordConfirm (проверка совпадения), email (опц.).
- `loginRequestSchema` — login, password.

**JWT (TokenPayload):** `userId`, `login`, `role` (вместо `phone`).

---

## 3. Текущее состояние

### 3.1 Инфраструктура

| Компонент | Состояние |
|-----------|-----------|
| **Docker Compose** | `web` (Next.js standalone), `db` (PostgreSQL 16). Тома: `pgdata`. Запуск только через `docker compose up --build`. |
| **Схема БД** | При старте `web` выполняется `prisma db push` — таблицы создаются/обновляются по `prisma/schema.prisma`. Миграции (prisma/migrations) опциональны; при необходимости: `docker compose run --rm web sh -c "prisma migrate dev --name init"`. |

### 3.2 Auth API

| Эндпоинт | Описание |
|----------|----------|
| `POST /api/auth/register` | login, password, passwordConfirm, email? → создание User, access+refresh, cookie. |
| `POST /api/auth/login` | login, password → access+refresh, cookie. |
| `POST /api/auth/refresh` | по refresh в cookie → новая пара токенов. |
| `POST /api/auth/logout` | инвалидация refresh, удаление cookie. |

`/api/auth/confirm` — **удалён**.

### 3.3 Страницы и UI

| Страница | Состояние |
|----------|-----------|
| `/` | Лендинг (Hero, секции, CTA). |
| `/login` | Форма: логин, пароль. Ссылка на `/register`. |
| `/register` | Форма: логин, email (опц.), пароль, подтверждение пароля. Один шаг, без SMS. |
| `/cabinet` | Профиль (логин, email из GET /api/profile), кнопка «Выйти». |
| `/forgot-password` | Заглушка «В разработке». |
| `/oferta`, `/politika`, `/kontakty` | Статический каркас, футер. |

**Header:** при авторизации — логин (ссылка в /cabinet) и «Выйти»; иначе «Регистрация» и «Войти». При смене маршрута перепроверка по /api/profile. **/login и /register:** при уже действующей сессии — редирект в /cabinet.

### 3.4 Схема БД (кратко)

- **User:** id, login (unique), email?, passwordHash, role, createdAt, updatedAt. Без `phone`, `name`.
- **Session, TipLink, Transaction, PayoutRequest** — без изменений по отношению к прежней схеме (см. `prisma/schema.prisma`).

### 3.5 Важные файлы

| Файл | Назначение |
|------|------------|
| `lib/validations.ts` | `loginSchema`, `registerSchema`, `loginRequestSchema`, `phoneSchema` (оставлен на потом), `passwordSchema`, и др. |
| `lib/auth/jwt.ts` | TokenPayload: `userId`, `login`, `role`. |
| `lib/middleware/auth.ts` | `requireAuth`, `requireRole`; проверка пользователя по `id` (поле `phone` в select убрано). |
| `lib/auth/sms.ts` | Оставлен, но в auth не используется (можно использовать для «забыл пароль» и т.п.). |

---

## 4. Известные проблемы и открытые моменты

1. **PROMPT.md:** в нём по-прежнему «телефон + SMS» для регистрации. Текущая реализация: **логин + пароль + подтверждение пароля, без SMS.**
2. **Сборка в Docker** выполняется в Linux-контейнере; проблемы с нативными модулями (lightningcss и т.п.) на хосте не возникают.

---

## 5. Следующие шаги (по приоритету)

Использовать [TODO.md](../TODO.md) как основной источник. Кратко:

1. **Восстановление пароля** (TODO 2.6): запрос кода, сброс по коду; можно задействовать `lib/auth/sms.ts` или email.
2. **Профиль и ссылки (TODO 3.2–3.5):** PATCH /profile, GET/POST /links, генерация slug.
3. **История и выводы (TODO 4.x), платёжный модуль и /pay (TODO 5.x), фронт ЛК и /pay (TODO 8–9)** — по плану в TODO.

---

## 6. Как быстро проверить текущий auth

1. `docker compose up --build`
2. В `.env` должны быть `JWT_SECRET`, `JWT_REFRESH_SECRET` (и при необходимости `POSTGRES_*`).
3. Открыть `/register` → логин, пароль, подтверждение → «Зарегистрироваться» → редирект в `/cabinet`.
4. Выйти, открыть `/login` → тот же логин и пароль → «Войти» → `/cabinet`.

Подробнее: [QUICK_START.md](../QUICK_START.md).

---

*Документ обновлён: 2025-01-25. Запуск только через Docker.*
