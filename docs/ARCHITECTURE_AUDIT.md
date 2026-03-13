# Аудит архитектуры (март 2025)

## 1. Текущая архитектура

### 1.1 Слои и границы

- **Презентация:** Next.js App Router (`app/`), страницы и API routes.
- **API routes:** Тонкий HTTP-слой (парсинг тела, валидация Zod, вызов логики, ответ). Бизнес-логика частично внутри маршрутов (создание выплаты, проверка лимитов, вызов Paygine).
- **Порты (интерфейсы):**
  - `lib/ports/user-repository.ts` — `IUserRepository` (поиск по логину/id, проверка доступа).
  - `lib/payment/gateway.ts` — `PaymentGateway` (createPayment, getStatus, handleWebhook).
- **Инфраструктура:**
  - `lib/infrastructure/` — Prisma-реализация UserRepository.
  - `lib/payment/stub-gateway.ts`, `lib/payment/paygine-gateway.ts` — реализации PaymentGateway.
- **Доменные хелперы:** `lib/balance.ts`, `lib/payout-limits.ts`, `lib/validations.ts`, `lib/payment/paygine-fee.ts`.
- **Конфиг:** `lib/config.ts` — единая точка входа с Zod-валидацией env (NODE_ENV, DATABASE_URL, JWT_*, PAYGINE_*, REDIS_URL, NEXT_PUBLIC_APP_URL).
- **Безопасность:** `lib/security/csrf.ts`, `lib/auth/`, `lib/middleware/auth.ts`, `lib/api-key-auth.ts`, `lib/auth-or-api-key.ts`.

### 1.2 Потоки

- **Аутентификация:** JWT (access + refresh в httpOnly cookie) + опционально X-API-Key; Session в БД для инвалидации (ADR 0001).
- **Платежи:** PaymentGateway (Stub или Paygine), webhook с проверкой подписи (ADR 0002).
- **Авторизация в API:** В каждом маршруте вызывается `requireAuth`, `requireRole(["ADMIN"])` или `requireAuthOrApiKey` — единого Next.js `middleware.ts` в корне нет, проверки встроены в handlers.

---

## 2. Что выровнено и работает хорошо

| Область | Состояние |
|--------|-----------|
| **Порты и адаптеры** | IUserRepository и PaymentGateway чётко выделены; подмена в тестах возможна (setUserRepository, выбор Stub/Paygine по env). |
| **Формат ответов API** | Единые хелперы: `jsonError`, `zodErrorResponse`, `rateLimit429Response`, `internalError` в `lib/api/helpers.ts`. |
| **Валидация** | Zod-схемы в `lib/validations.ts`, лимиты (пароль, суммы, slug), парсинг тела с лимитом размера. |
| **Rate limit** | Централизован в `lib/middleware/rate-limit.ts`, константы AUTH_RATE_LIMIT, REGISTRATION_REQUEST_RATE_LIMIT, WEBHOOK, PAY_*. |
| **RBAC** | requireRole, requireEstablishmentAdmin; SUPERADMIN наследует доступ ADMIN. |
| **Документация решений** | ADR 0001 (JWT), ADR 0002 (PaymentGateway), CODE_REVIEW.md. |
| **База данных** | Prisma, параметризованные запросы; единственный raw — `SELECT 1` в health. |

---

## 3. Что стоит выровнять или изменить

### 3.1 [Средний приоритет] Конфигурация: единая точка входа

**Проблема:** В `lib/config.ts` есть валидация env и геттеры (getPaygineConfig, getPaygineBaseUrl, getPaygineRequestTimeoutMs и др.), но часть кода по-прежнему читает `process.env` напрямую:

- `lib/payment/paygine-gateway.ts` — PAYGINE_SECTOR, PAYGINE_PASSWORD, PAYGINE_SD_REF_LEGAL, PAYGINE_RELOCATE_DELAY_MS, PAYGINE_RELOCATE_RETRY_MS, NODE_ENV.
- `lib/payment/send-payout-to-paygine.ts` — PAYGINE_SECTOR, PAYGINE_PASSWORD.
- `lib/payment/request-paygine-balance.ts` — PAYGINE_SECTOR, PAYGINE_PASSWORD.
- `lib/payment/stub-gateway.ts` — PAYMENT_WEBHOOK_SECRET, PAYGINE_SECTOR, PAYGINE_PASSWORD.
- `lib/payment/paygine/client.ts` — PAYGINE_BASE_URL, PAYGINE_REQUEST_TIMEOUT_MS (частично уже через config в getPaygineBaseUrl).
- `lib/default-recipient-settings.ts` — DEFAULT_RECIPIENT_*.
- `lib/email/send.ts` — SMTP_*, RESEND_*.
- `lib/logger.ts` — LOG_FILE.
- `lib/middleware/rate-limit.ts` — TRUST_PROXY, PAY_RATE_LIMIT_IP_MAX, PAY_RATE_LIMIT_SLUG_MAX.
- `lib/payment/redirect-token.ts` — JWT_SECRET, PAY_REDIRECT_SECRET.
- `lib/get-base-url.ts` — NEXT_PUBLIC_APP_URL, NODE_ENV.

**Рекомендация:** Постепенно переводить чтение на геттеры из `lib/config.ts`. Для Paygine: везде использовать `getPaygineConfig()`, `getPaygineBaseUrl()`, `getPaygineRequestTimeoutMs()`. Опционально расширить schema в config для PAYGINE_SD_REF_LEGAL, PAYGINE_RELOCATE_DELAY_MS, PAYGINE_RELOCATE_RETRY_MS, TRUST_PROXY, PAY_*_MAX, LOG_FILE и т.д., чтобы валидация и типы были в одном месте.

**Выгода:** Один источник правды для env, проще тесты (resetConfigCache), меньше риска опечаток и расхождений.

---

### 3.2 [Низкий приоритет] Слой приложения (use cases)

**Проблема:** Крупные сценарии (создание выплаты, логин, создание платежа) реализованы прямо в API route: валидация, проверка лимитов, запросы к БД, вызов Paygine. Слой «приложение» (use case) не выделен.

**Рекомендация:** Для текущего размера проекта это допустимо. При росте можно вынести, например:

- `lib/application/create-payout.ts` — функция `createPayout(userId, params)` с проверкой баланса, лимитов, созданием PayoutRequest и при необходимости вызовом sendPayoutToPaygine.
- Аналогично: `login`, `createPayment` и т.д.

Тогда route только парсит запрос, вызывает use case и формирует ответ. Удобнее unit-тесты и повторное использование логики (например, из очереди или другого API).

**Действие:** Пока не обязательно; зафиксировать в ADR или в этом аудите как возможное развитие.

---

### 3.3 [Низкий приоритет] Именование `lib/middleware`

**Проблема:** В Next.js под «middleware» обычно понимают корневой `middleware.ts`. У вас в `lib/middleware/` лежат не Next.js middleware, а хелперы авторизации (`requireAuth`, `requireRole`, `requireEstablishmentAdmin`) и rate limit, вызываемые из route handlers.

**Рекомендация:** Либо переименовать, например, в `lib/auth/` (auth уже есть — можно объединить) или `lib/request-auth.ts` / `lib/route-auth.ts`, либо оставить как есть и явно описать в README/архитектуре: «это не Next.js middleware, а функции проверки прав для маршрутов».

---

### 3.4 [Низкий приоритет] Дублирование путей в путях к файлам

**Наблюдение:** В списках файлов встречаются и `app\api\...`, и `app/api/...` — это различие слэшей (Windows vs Unix), дубликатов файлов нет.

**Действие:** Не требуется.

---

### 3.5 [Информационно] Расширение config для опциональных переменных

Переменные вроде TRUST_PROXY, PAY_RATE_LIMIT_IP_MAX, PAYGINE_RELOCATE_DELAY_MS, LOG_FILE, SMTP_*, RESEND_* не проходят через Zod в config. Их добавление в `lib/config.ts` (с optional и дефолтами) улучшит документирование и валидацию при старте, но не блокирует текущую работу.

---

## 4. Итоговая таблица рекомендаций

| Приоритет | Рекомендация | Усилие |
|-----------|--------------|--------|
| Средний | Выровнять конфиг: везде использовать геттеры из `lib/config.ts` (в первую очередь Paygine, затем по желанию rate-limit, email, logger). | 1–2 дня |
| Низкий | При росте — выделить use-case слой (createPayout, login и т.д.). | По необходимости |
| Низкий | Уточнить именование/документирование `lib/middleware` (не Next.js middleware). | ~1 час |

---

## 5. AQB Summary

```
[AQB:Sec] Порты (User, Payment), CSRF, JWT, API Key, rate limit — согласованы. Конфиг в одном месте усилит контроль env.
[AQB:Test] Репозиторий и шлюз подменяемы; единый config упрощает тесты.
[AQB:Perf] Архитектура не накладывает лишних слоёв; баланс и лимиты считаются точечно.
[AQB:Maint] Выравнивание конфига снижает расхождения; use-case слой — опционально при росте.
[AQB:DevOps] Stateless, env через config; при расширении config — явная валидация всех переменных.
[AQB:Doc] ADR и данный аудит зафиксированы; при переименовании middleware — обновить описание.
[AQB:Biz] Изменения не меняют поведение; выравнивание конфига и именований — внутренние улучшения.
```
