# Отчёт по проверке уязвимостей

Дата: 2026-02-05. Обновлено: 2026-02-09. Обзор кодовой базы: аутентификация, авторизация, ввод данных, CSRF, заголовки, секреты, файловые операции.

---

## 1. Что сделано хорошо

### 1.1 Аутентификация
- **Пароли:** bcrypt (12 раундов), пароли не логируются.
- **JWT:** отдельные секреты для access и refresh; access 15 мин, refresh 7 дней; алгоритм HS256, библиотека jose.
- **Refresh token:** хранится в httpOnly cookie (`secure` в production, `sameSite: strict`), при refresh выдаётся новый токен и обновляется в БД (ротация).
- **Сессии:** проверка в БД при refresh, истёкшие/заблокированные пользователи обрабатываются, cookie сбрасывается.

### 1.2 Авторизация (RBAC)
- Защищённые API используют `requireAuth` / `requireRole`; роль берётся из JWT и при необходимости проверяется пользователь в БД (isBlocked).
- Админские маршруты ограничены ролями (SUPERADMIN/ADMIN), ID из URL используются в Prisma по первичному ключу — нет IDOR за счёт проверки прав.

### 1.3 Валидация ввода
- Zod-схемы на границах: логин, пароль, email, телефон, slug, суммы, реквизиты, заявки.
- Ограничения длины (например, 255, 500, 1000 символов), форматы (телефон, email, дата).
- Prisma — параметризованные запросы, риска SQL-инъекций нет.

### 1.4 CSRF
- Для мутирующих API (не GET/HEAD/OPTIONS) проверяется: тот же origin, заголовок `x-csrf-token` совпадает с cookie `csrfToken`.
- Исключения: Bearer-авторизация и `/api/payment/webhook` (внешний вызов).
- Cookie для CSRF с `sameSite: lax`, в production — `secure`.

### 1.5 Заголовки безопасности
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (geolocation, microphone, camera отключены)
- Content-Security-Policy (CSP) задаётся в middleware
- HSTS в production (max-age, includeSubDomains, preload)

### 1.6 Rate limiting
- Глобальный лимит по IP для `/api/*`.
- Отдельные лимиты для auth (login, register, refresh) и для POST `/api/registration-requests`.

### 1.7 Файлы и пути
- В `receipt` путь строится из `payout.id` (UUID из БД), не из пользовательского ввода — path traversal отсутствует.
- Имя файла в Content-Disposition формируется из того же идентификатора.

### 1.8 Секреты и окружение
- JWT и refresh секреты только в `process.env`, не в `NEXT_PUBLIC_*`.
- В логах не передаются пароли или токены; контекст задаётся в коде вызова.

### 1.9 XSS
- В приложении не используется `dangerouslySetInnerHTML`; вывод через React по умолчанию экранируется.
- Внешние ссылки (mailto, tel, paygine) — статичные или из конфига.

### 1.10 Редиректы
- Редиректы после логина/логаута ведут на фиксированные пути (/, /login, /cabinet, /admin/dashboard); открытых редиректов по пользовательскому URL нет.

---

## 2. Замечания и рекомендации

### 2.1 ~~[Средний] Webhook платёжного провайдера~~ — исправлено
- В `lib/payment/stub-gateway.ts` добавлена проверка подписи: при заданном `PAYMENT_WEBHOOK_SECRET` подпись HMAC-SHA256 тела сравнивается с заголовком `X-Webhook-Signature` (формат `sha256=<hex>`). В production без секрета webhook отклоняется (fail closed); в development без секрета принимается для удобства заглушки. Сравнение подписи — `timingSafeEqual`.

### 2.2 [Низкий] CSP: unsafe-inline для script/style
- **Файл:** `middleware.ts` — добавлен комментарий о причине `unsafe-inline` (Next.js). Добавлен `object-src 'none'` для блокировки плагинов. Полный отказ от inline зависит от сборки Next.js.

### 2.3 ~~[Низкий] Дублирование констант rate limit~~ — исправлено
- В `app/api/auth/refresh/route.ts` используется единый `AUTH_RATE_LIMIT` из `lib/middleware/rate-limit.ts`.

### 2.4 ~~[Инфо] Логирование контекста~~ — улучшено
- В `lib/logger.ts` перед записью контекст проходит через `sanitizeContext`: ключи, содержащие `password`, `secret`, `token`, а также явный список (`password`, `authorization`, `refreshToken`, `apiKey` и т.д.), заменяются на `[REDACTED]`.

### 2.5 ~~[Средний] DoS через большой body запроса~~ — исправлено (2026-02-09)
- **Webhook** `/api/payment/webhook`: тело запроса читалось без ограничения. Добавлен `readTextWithLimit` (лимит 256 KB).
- **Profile PATCH, Payouts POST, Admin API**: `request.json()` заменён на `parseJsonWithLimit` (лимит 512 KB для auth/admin).
- Добавлена функция `readTextWithLimit` в `lib/api/helpers.ts`.

### 2.6 ~~[Низкий] ReDoS в CSRF cookie~~ — исправлено (2026-02-09)
- В `lib/security/csrf-client.ts` имя cookie экранируется перед вставкой в regex: `name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`.

### 2.7 ~~[Низкий] Webhook rate limit~~ — исправлено (2026-02-09)
- Добавлен `WEBHOOK_RATE_LIMIT`: 60 запросов/мин по IP. Webhook проверяет лимит до обработки тела.

---

## 3. Итоговая таблица

| Область           | Оценка   | Комментарий |
|-------------------|----------|-------------|
| Аутентификация    | Хорошо   | bcrypt, JWT, refresh в httpOnly, ротация |
| Авторизация       | Хорошо   | RBAC, проверка isBlocked, нет IDOR |
| Валидация ввода   | Хорошо   | Zod, лимиты длины, Prisma |
| CSRF              | Хорошо   | Double-submit, same-origin, исключения учтены |
| Заголовки         | Хорошо   | CSP, HSTS, X-Frame-Options и др. |
| Секреты/логи      | Хорошо   | Нет секретов в NEXT_PUBLIC, пароли не логируются |
| Rate limiting     | Хорошо   | API + auth + registration-requests + webhook |
| Файлы/пути        | Хорошо   | Нет path traversal |
| Webhook (stub)    | Исправлено | Проверка HMAC-SHA256 при заданном PAYMENT_WEBHOOK_SECRET |
| CSP (inline)      | Низкий   | Добавлен object-src 'none', комментарий по unsafe-inline |

Критических уязвимостей не выявлено. Внесённые улучшения: проверка подписи webhook, санитизация контекста логов, единый AUTH_RATE_LIMIT в refresh, ограничение размера body (parseJsonWithLimit, readTextWithLimit), экранирование regex в csrf-client, rate limit для webhook.

---

## 4. Дополнительное усиление (последний проход)

- **Валидация:** пароль ограничен 8–256 символами (защита от DoS); токен регистрации max 512; сумма в копейках ограничена сверху (100 млн ₽).
- **Ошибки 500:** в production детали ошибки (например, в receipt) не отдаются клиенту; подсказка по шрифту только в dev.
- **Заголовки:** добавлены `x-permitted-cross-domain-policies: none`, `x-xss-protection: 0` (CSP достаточно).
- **Код:** удалён неиспользуемый `lib/auth/sms.ts`; в `lib/utils.ts` оставлены только используемые функции (`formatMoney`); удалён устаревший экспорт `REGISTRATION_TOKEN_TTL_MS`; константа `REQUEST_ID_HEADER` вынесена в один модуль (`lib/security/request`).
- **Body size limit (2026-02-09):** все API, читающие JSON или raw body, используют `parseJsonWithLimit` или `readTextWithLimit` для защиты от DoS при больших запросах.

---

## 5. Обновления 2026-02-27 (аудит + рекомендации)

- **Open Redirect:** В production при отсутствии `NEXT_PUBLIC_APP_URL` функция `getBaseUrlFromRequest` (lib/get-base-url.ts) больше не использует `origin` из запроса и возвращает пустую строку — создание платежа с редиректом завершается ошибкой. Для работы оплаты в production обязательно задавать `NEXT_PUBLIC_APP_URL`.
- **Чеки выплат:** В `/api/payouts/[id]/receipt` суперадмин может скачивать чеки любых выплат. Тип `AuthUserId` расширен полем `role?`; при авторизации по Bearer роль передаётся; при `role === "SUPERADMIN"` проверка владельца заявки не выполняется.
- **Seed:** Пароль суперадмина не выводится в консоль (исправлено ранее).
- **CI:** В pipeline добавлен шаг `npm run test` после сборки.
