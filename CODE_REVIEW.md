# Code Review — Отчёт об ошибках и улучшениях

## 1. Уязвимости и безопасность

### 1.1 [HIGH] POST /api/registration-requests без rate limit
- **Файл:** `app/api/registration-requests/route.ts`
- **Проблема:** Публичный endpoint создаёт записи в БД без ограничения частоты запросов. Возможен спам заявками и DoS.
- **Рекомендация:** Добавить rate limit по IP (аналогично login/register).

### 1.2 [MEDIUM] Некорректная обработка ZodError в login
- **Файл:** `app/api/auth/login/route.ts`
- **Проблема:** Используется `error.name === "ZodError"` вместо `error instanceof z.ZodError`. При выбросе ZodError от `parse()` в catch попадёт ZodError, но проверка по имени ненадёжна; кроме того, в ответ уходит сырой `error` (в т.ч. детали валидации), что может раскрывать лишнюю информацию.
- **Рекомендация:** Проверять `error instanceof z.ZodError` и возвращать только безопасное сообщение и при необходимости ограниченные details.

### 1.3 [LOW] Rate limit: IP "unknown"
- **Файл:** `lib/middleware/rate-limit.ts`
- **Проблема:** При отсутствии `x-forwarded-for` и `x-real-ip` возвращается `"unknown"`. Все такие запросы считаются одним ключом — возможен обход rate limit или, наоборот, блокировка всех клиентов за прокси без передачи IP.
- **Рекомендация:** Документировать необходимость проксирования IP; в проде убедиться, что прокси выставляет заголовки.

---

## 2. Логические ошибки

### 2.1 [LOW] Дублирование констант времени
- **Файлы:** `middleware.ts`, `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`
- **Проблема:** `SECOND_MS`, `MINUTE_MS`, окна и лимиты для rate limit заданы в нескольких местах.
- **Рекомендация:** Вынести в общий модуль (например `lib/constants.ts` или в `rate-limit.ts`) и переиспользовать.

### 2.2 [LOW] Лишнее приведение типа в dashboard
- **Файл:** `app/admin/dashboard/page.tsx`
- **Проблема:** `(data.requests ?? []) as (RegistrationRequestRow & { tokenExpiresAt?: string | null })[]` — API уже возвращает `tokenExpiresAt`; тип можно описать один раз в интерфейсе.
- **Рекомендация:** Типизировать ответ API и убрать лишний cast.

---

## 3. Качество кода и мусор

### 3.1 [MEDIUM] console.error / console.warn в коде приложения
- **Файлы:** `app/admin/dashboard/page.tsx`, `app/admin/users/page.tsx`, `app/admin/payouts/page.tsx`, `app/change-password/page.tsx`, `app/register/page.tsx`, `app/api/payouts/[id]/receipt/route.ts`
- **Проблема:** Используются `console.error`/`console.warn` вместо единого логгера. В проде сложнее централизовать логи и уровни.
- **Рекомендация:** Использовать `lib/logger` (logError и т.п.) в API; на клиенте либо оставить console в dev, либо прокидывать ошибки в систему мониторинга.

### 3.2 [LOW] Длинная цепочка в useEffect (localStorage) в dashboard
- **Файл:** `app/admin/dashboard/page.tsx`
- **Проблема:** Логика чтения/очистки localStorage и обновления state в одном useEffect записана плотно; сложнее читать и тестировать.
- **Рекомендация:** Вынести чтение и фильтрацию в чистую функцию `loadIssuedLinksFromStorage(): Record<string, string>`.

### 3.3 [LOW] Неиспользуемый импорт/экспорт
- **Файл:** `lib/security/request.ts`
- **Проблема:** Экспортируется `UNKNOWN_REQUEST_ID` — проверить использование; в `middleware.ts` используется свой `getRequestId` с `crypto.randomUUID()`, а в API — `lib/security/request.getRequestId`. Возможна путаница.
- **Рекомендация:** Убедиться, что везде один источник requestId; неиспользуемые экспорты удалить.

### 3.4 [LOW] Дублирование формата ответа об ошибке валидации
- **Файлы:** `app/api/auth/register/route.ts` (ZodError → details), `app/api/auth/login/route.ts` (другой формат).
- **Рекомендация:** Единый формат для 400 при ошибках валидации (например `{ error: string, details?: Array<{ path, message }> }`).

---

## 4. Прошедшие исправления (из предыдущего ревью)

- Валидация query в admin endpoints (status, period, pagination, search).
- Проверка существования пользователя в PATCH /api/admin/users/[id].
- Ограничение длины payout `externalId`.
- Комментарии по ролям ADMIN/SUPERADMIN приведены в соответствие с кодом.
- Рефакторинг admin user detail route.

---

## 5. Итоговая таблица

| Severity | Категория        | Описание                                      | Статус   |
|----------|------------------|-----------------------------------------------|----------|
| HIGH     | Security         | Rate limit на POST /api/registration-requests | Исправлено |
| MEDIUM   | Security         | Обработка ZodError в login                    | Исправлено |
| MEDIUM   | Качество         | Замена console на logger в API               | Исправлено |
| LOW      | Security         | IP "unknown" в rate limit                     | Документировано в getClientIP |
| LOW      | Дублирование     | Константы времени                             | Вынесены в rate-limit.ts |
| LOW      | Типы             | Dashboard API response                        | Упрощён тип |
| LOW      | Читаемость       | localStorage в dashboard                       | Вынесен loadIssuedLinksFromStorage() |
| LOW      | Консистентность  | Формат ошибок валидации auth                  | Единый формат в login/register |

## 6. Изменённые файлы (этот раунд)

- `CODE_REVIEW.md` — актуализирован отчёт
- `lib/middleware/rate-limit.ts` — экспорт AUTH_RATE_LIMIT, REGISTRATION_REQUEST_RATE_LIMIT; комментарий про IP
- `app/api/registration-requests/route.ts` — rate limit по IP перед созданием заявки
- `app/api/auth/login/route.ts` — AUTH_RATE_LIMIT из rate-limit; обработка ZodError через instanceof + единый формат 400
- `app/api/auth/register/route.ts` — AUTH_RATE_LIMIT из rate-limit
- `app/admin/dashboard/page.tsx` — loadIssuedLinksFromStorage(), упрощён тип запросов, убран console.error
- `app/api/payouts/[id]/receipt/route.ts` — logWarn/logError вместо console
- `lib/auth/jwt.ts` — logWarn вместо console.warn при ошибках cookie
- `app/admin/users/page.tsx`, `app/admin/payouts/page.tsx`, `app/change-password/page.tsx`, `app/register/page.tsx`, `app/admin/layout.tsx`, `app/cabinet/layout.tsx` — удалены console.error/console.warn

---

## 7. Текущий раунд ревью (февраль 2025)

### 7.1 [LOW] Дублирование `isPlaceholder` — исправлено
- **Было:** `ContactsSection.tsx` объявлял свою функцию `isPlaceholder`, тогда как в `config/site.ts` уже экспортируется та же логика.
- **Исправлено:** Импорт `isPlaceholder` из `@/config/site` в `ContactsSection.tsx`; локальная функция удалена.

### 7.2 [LOW] console.error в error boundaries
- **Файлы:** `app/error.tsx`, `app/cabinet/error.tsx`
- **Проблема:** В `useEffect` вызывается `console.error(error)`. Для error boundary в React это распространённая практика (логирование в консоль для отладки), но по правилам проекта предпочтителен единый логгер.
- **Рекомендация:** На клиенте можно оставить `console.error` для error boundary (т.к. `lib/logger` ориентирован на сервер) или добавить в logger обёртку для клиента и вызывать её из boundary. Явно задокументировать в комментарии: «Логирование в консоль для мониторинга ошибок рендера».

### 7.3 [LOW] Дублирование строки ключа темы
- **Файлы:** `app/layout.tsx` (inline script: `'freetips-theme'`), `lib/theme-context.tsx` (`STORAGE_KEY = "freetips-theme"`).
- **Проблема:** Одна и та же константа в двух местах; при смене ключа можно забыть обновить layout.
- **Рекомендация:** Экспортировать ключ из `lib/theme-context.tsx` (например `export const THEME_STORAGE_KEY`) и в layout генерировать скрипт из этой константы через небольшой шаблон или передавать через data-атрибут. Либо оставить как есть и добавить комментарий «при смене ключа обновить layout.tsx».

### 7.4 [LOW] DRY: повтор класса градиента в лендинге
- **Файлы:** `Hero.tsx`, `HowItWorks.tsx`, `ForWho.tsx`, `ContactsSection.tsx`
- **Проблема:** Один и тот же длинный класс светлой темы повторяется в четырёх секциях: `bg-gradient-to-br from-primary-300/90 via-primary-100/60 to-accent-300/90`.
- **Рекомендация:** Вынести в константу (например в `config/site.ts` или `components/landing/section-classes.ts`) строку `SECTION_GRADIENT_LIGHT = "bg-gradient-to-br from-primary-300/90 via-primary-100/60 to-accent-300/90"` и использовать в секциях. Либо оставить как есть ради явности и независимости секций.

### 7.5 Положительные моменты
- **Тема:** Dark mode переключен на класс (`.dark`) в `globals.css` через `@custom-variant`, выбор темы в приложении корректно применяется независимо от системной.
- **Безопасность:** Секреты не захардкожены; регистрация заявок защищена rate limit; CSRF и auth вынесены в отдельные модули.
- **Лендинг:** Чередование секций (градиент / белый) в светлой теме и (slate-900 / slate-800) в тёмной — читаемо и единообразно.
- **Конфиг:** `config/site.ts` — единая точка правды для навигации, футера и плейсхолдеров.

---

## 8. AQB Summary (Architecture & Quality Board)

```
[AQB:Sec] Секреты не в коде; rate limit на registration-requests; auth/CSRF вынесены. IP "unknown" при отсутствии заголовков — документировано.
[AQB:Test] Есть тесты CSRF, rate-limit, валидации; error boundaries не покрыты e2e — приёмлемо.
[AQB:Perf] Нет O(n²) в горячих путях; лендинг статичен; градиенты/тени лёгкие.
[AQB:Maint] Дублирование isPlaceholder устранено; константа градиента секций — опциональный рефакторинг. Публичный API конфига и темы понятен.
[AQB:DevOps] Конфиг через env; приложение stateless; тема в localStorage — откат через очистку/переключение.
[AQB:Doc] CODE_REVIEW.md и docs/ актуализированы; inline-комментарии в theme-context и globals (dark variant) достаточны.
[AQB:Biz] Лендинг и темы соответствуют требованиям; переключение светлая/тёмная и чередование секций работают.
```
