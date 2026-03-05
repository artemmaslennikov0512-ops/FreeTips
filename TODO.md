# TODO — Платформа безналичных чаевых

> **Правило:** этот файл должен оставаться в актуальном состоянии. При выполнении задачи — менять статус на `Done` и дату. При появлении новой задачи — добавлять в нужную секцию. При смене приоритета — обновлять.

**Легенда статусов:** `Todo` | `In Progress` | `Done` | `Blocked`  
**Приоритет:** `P0` (критично для MVP) | `P1` (важно для MVP) | `P2` (после MVP)

---

## 0. Подготовка и инфраструктура

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 0.1 | Done | P0 | Инициализация репозитория: структура папок (app, components, config), .gitignore | / | 2025-01-24 |
| 0.2 | Done | P0 | Настроить TypeScript (strict), ESLint, .env.example | / | 2025-01-24 |
| 0.3 | Done | P0 | Выбор и базовая настройка стека: Next.js 16, Tailwind v4, React 19 (STACK.md) | / | 2025-01-24 |
| 0.4 | Done | P1 | Docker: Dockerfile (standalone), docker-compose (web + db). Dev-контейнер убран | / | 2025-01-24 |
| 0.5 | Done | P1 | Исправлен текст про регистрацию: уточнено, что "без приложений" — для гостя | components/landing | 2025-01-24 |
| 0.6 | Done | P1 | Запуск только через Docker (docker compose up); dev-контейнер и npm run dev на хосте убраны | / | 2025-01-25 |
| 0.7 | Done | P1 | Favicon: app/icon.svg (emerald «1»), Next.js подхватывает автоматически | app/icon.svg | 2025-01-25 |

---

## 1. База данных и миграции

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 1.1 | Done | P0 | Схема: users (id, login/unique, email?, passwordHash, role, createdAt, updatedAt). phone, name убраны | prisma/schema.prisma | 2025-01-24 |
| 1.2 | Done | P0 | Схема: sessions (id, userId, refreshToken, deviceInfo?, expiresAt) | prisma/schema.prisma | 2025-01-24 |
| 1.3 | Done | P0 | Схема: tip_links (id, userId, slug/uniqueId, createdAt) — уникальная ссылка на пользователя | prisma/schema.prisma | 2025-01-24 |
| 1.4 | Done | P0 | Схема: transactions (id, linkId, amountKop BigInt, payerInfo?, status, externalId, idempotencyKey, createdAt) | prisma/schema.prisma | 2025-01-24 |
| 1.5 | Done | P0 | Схема: payout_requests (id, userId, amountKop BigInt, details/реквизиты, status, externalId?, createdAt) | prisma/schema.prisma | 2025-01-24 |
| 1.6 | Done | P1 | Prisma настроен: schema, индексы, связи, enums. PostgreSQL в docker-compose. lib/db.ts, lib/validations.ts, lib/utils.ts | prisma/, lib/ | 2025-01-24 |
| 1.7 | Done | P1 | Схема: добавить роль SUPERADMIN в UserRole enum (выше ADMIN) | prisma/schema.prisma | 2025-01-25 |
| 1.8 | Done | P1 | Схема: добавить поле mustChangePassword Boolean @default(false) в User — флаг обязательной смены пароля при первом входе | prisma/schema.prisma | 2025-01-25 |
| 1.9 | Done | P1 | Миграция/seed: создание первого суперадмина (логин и пароль из env или seed), mustChangePassword=true | prisma/seed.ts | 2025-01-25 |

---

## 2. Backend — Auth

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 2.1 | Done | P0 | Регистрация: POST /api/auth/register (login, password, passwordConfirm, email?) — создание User, выдача токенов, без SMS | app/api/auth/register | 2025-01-24 |
| 2.2 | Done | P0 | Confirm убран: регистрация сразу создаёт User и выдаёт токены (без SMS) | app/api/auth/register | 2025-01-24 |
| 2.3 | Done | P0 | Вход: POST /api/auth/login (login, password) — access + refresh в httpOnly cookie | app/api/auth/login | 2025-01-24 |
| 2.4 | Done | P0 | Refresh: POST /api/auth/refresh — обновление пары токенов | app/api/auth/refresh | 2025-01-24 |
| 2.5 | Done | P0 | Выход: POST /api/auth/logout — инвалидация refresh | app/api/auth/logout | 2025-01-24 |
| 2.6 | Todo | P1 | Восстановление пароля: запрос кода, сброс по коду | app/api/auth | — |
| 2.7 | Done | P0 | Middleware: проверка JWT, извлечение user, 401/403 | lib/middleware/auth.ts | 2025-01-24 |
| 2.8 | Done | P1 | Middleware: rate limiting по IP и по userId | lib/middleware/rate-limit.ts | 2025-01-24 |
| 2.9 | Done | P1 | POST /api/auth/login: в ответе добавить mustChangePassword: true, если у пользователя mustChangePassword=true | app/api/auth/login | 2025-01-25 |
| 2.10 | Done | P1 | POST /api/profile/change-password: после успешной смены пароля сбросить mustChangePassword=false | app/api/profile/change-password | 2025-01-25 |
| 2.11 | Done | P1 | Middleware: обновить requireRole для поддержки SUPERADMIN (SUPERADMIN имеет доступ ко всем эндпоинтам ADMIN) | lib/middleware/auth.ts | 2025-01-25 |

---

## 3. Backend — Профиль и ссылки

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 3.1 | Done | P0 | GET /profile — данные текущего пользователя | app/api/profile | 2025-01-25 |
| 3.2 | Done | P0 | PATCH /profile — обновление login, email; POST /profile/change-password | app/api/profile | 2025-01-25 |
| 3.3 | Done | P0 | GET /links — список своих ссылок (в MVP одна); GET /links/:id или /links/me | app/api/links | 2025-01-25 |
| 3.4 | Done | P0 | POST /links — создание ссылки при первом заходе в ЛК (если нет) | app/api/links | 2025-01-25 |
| 3.5 | Done | P0 | Генерация slug/uniqueId: короткий, уникальный, URL-safe | lib/generate-slug, app/api/links | 2025-01-25 |

---

## 4. Backend — История платежей и выводы

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 4.1 | Done | P0 | GET /transactions — история чаевых (фильтр: статус), limit/offset | app/api/transactions | 2025-01-25 |
| 4.2 | Done | P0 | GET /payouts — список заявок на вывод, balanceKop | app/api/payouts | 2025-01-25 |
| 4.3 | Done | P0 | POST /payouts — создание заявки (сумма, реквизиты), проверка баланса | app/api/payouts | 2025-01-25 |
| 4.4 | Done | P1 | Расчёт баланса: сумма успешных transactions минус сумма успешных payouts | app/api/profile (stats) | 2025-01-25 |

---

## 5. Backend — Платёжный модуль и страница приёма

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 5.1 | Done | P0 | Интерфейс PaymentGateway: createPayment, getStatus, handleWebhook | lib/payment/gateway.ts | 2025-01-25 |
| 5.2 | Done | P0 | Заглушка StubPaymentGateway: создаёт Transaction SUCCESS | lib/payment/stub-gateway.ts | 2025-01-25 |
| 5.3 | Blocked | P0 | Реализация реального адаптера по API платежки (после получения документации) | backend/payment | — |
| 5.4 | Done | P0 | GET /pay/:slug — данные для страницы (имя получателя, настройки мин/макс суммы) | app/api/pay/[slug] | 2025-01-25 |
| 5.5 | Done | P0 | POST /pay/:slug — инициализация платежа (заглушка: создаёт Transaction SUCCESS) | app/api/pay/[slug] | 2025-01-25 |
| 5.6 | Done | P0 | POST /payment/webhook — приём вебхуков (заглушка: 200) | app/api/payment/webhook | 2025-01-25 |

---

## 6. Frontend — Лендинг

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 6.1 | Done | P0 | Макет и вёрстка: Hero, ценность, CTA «Подключиться» | components/landing | 2025-01-24 |
| 6.2 | Done | P0 | Секции: About, HowItWorks, Adapt, ForWho, FAQ, ContactsSection, CTA | components/landing | 2025-01-24 |
| 6.3 | Done | P0 | Header: логотип, навигация; при входе — логин и «Выйти», иначе «Регистрация» и «Войти»; боковое меню на мобильных; перепроверка по pathname | components/Header | 2025-01-25 |
| 6.4 | Done | P0 | Адаптив: mobile-first, боковое меню, брейкпоинты sm/md/lg | app, components | 2025-01-24 |
| 6.5 | Done | P0 | Дизайн: primary (emerald), Plus Jakarta Sans, секции, тени | tailwind, globals | 2025-01-24 |
| 6.6 | Done | P0 | Footer: логотип, ссылки на документы, реквизиты, поддержка — config/site | components/Footer | 2025-01-24 |
| 6.7 | Done | P0 | Страницы /oferta, /politika, /kontakty — каркас; футер через layout | app/oferta, etc. | 2025-01-24 |
| 6.8 | Done | P1 | config/site.ts + FOOTER_DATA.placeholder.md — плейсхолдеры для данных | config, FOOTER_DATA | 2025-01-24 |

---

## 7. Frontend — Auth (страницы и логика)

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 7.1 | Done | P0 | Страница входа: логин + пароль, «Забыли пароль», ссылка на регистрацию; при уже авторизованном — редирект в /cabinet | app/login | 2025-01-25 |
| 7.2 | Done | P0 | Страница регистрации: логин, email (опц.), пароль, подтверждение пароля; один шаг, без SMS; при уже авторизованном — редирект в /cabinet | app/register | 2025-01-25 |
| 7.3 | Todo | P1 | Страница восстановления пароля | frontend/auth | — |
| 7.4 | Done | P0 | Клиент: accessToken в localStorage, редирект в /cabinet после login/register. TODO: авто-приложение к запросам, refresh по 401 | app/login, app/register, app/cabinet | 2025-01-24 |

---

## 8. Frontend — Личный кабинет

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 8.1 | Done | P0 | Layout ЛК: сайдбар/навбар, выход, переход по разделам | app/cabinet/layout | 2025-01-25 |
| 8.2 | Done | P0 | Профиль: отображение, форма редактирования, смена пароля, статистика | app/cabinet | 2025-01-25 |
| 8.3 | Done | P0 | Блок «Моя ссылка»: отображение URL, кнопка «Копировать» | app/cabinet/link | 2025-01-25 |
| 8.4 | Done | P0 | Генерация и отображение QR-кода по ссылке; кнопка «Скачать» (PNG/SVG) | app/cabinet/link | 2025-01-25 |
| 8.5 | Done | P0 | История платежей: таблица (дата, сумма, статус) | app/cabinet/transactions | 2025-01-25 |
| 8.6 | Done | P0 | Вывод: форма (сумма, реквизиты), список заявок со статусами | app/cabinet/payouts | 2025-01-25 |

---

## 9. Frontend — Страница приёма чаевых (по ссылке)

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 9.1 | Done | P0 | Страница /pay/:slug: имя получателя, выбор суммы (фикс + своя), поле отзыва | app/pay/[slug] | 2025-01-25 |
| 9.2 | Done | P0 | Кнопка «Оплатить»: вызов API (заглушка — без редиректа к платежке) | app/pay/[slug] | 2025-01-25 |
| 9.3 | Done | P0 | QR-код на странице — та же ссылка, чтобы гость мог показать экран и дать отсканировать | app/pay/[slug] | 2025-01-25 |
| 9.4 | Done | P0 | Экраны «Успех» и «Ошибка» после оплаты; при ошибке — повторить | app/pay/[slug] | 2025-01-25 |
| 9.5 | Done | P0 | Без регистрации: гость только вводит платёжные данные на стороне провайдера | app/pay/[slug] | 2025-01-25 |

---

## 10. Интеграция с платёжным API (после документации)

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 10.1 | Blocked | P0 | Реализовать адаптер PaymentGateway по документации провайдера | backend/payment | — |
| 10.2 | Blocked | P0 | Обработка вебхуков: маппинг статусов, зачисление, уведомление о выводе | backend/payment | — |
| 10.3 | Blocked | P1 | Тесты: sandbox-сценарии успех/неуспех/дубль | backend/payment | — |

---

## 11. Тесты и качество

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 11.1 | Todo | P1 | Юнит-тесты: сервисы auth, баланс, idempotency | backend | — |
| 11.2 | Todo | P1 | Интеграционные тесты: POST /auth/*, GET /profile, GET /transactions | backend | — |
| 11.3 | Todo | P2 | E2E (Playwright/Cypress): регистрация → ЛК → копирование ссылки → оплата по ссылке (с заглушкой) | frontend | — |

---

## 12. Деплой и документация

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 12.1 | Done | P1 | README: установка, env, запуск, миграции | README.md | 2025-01-25 |
| 12.2 | Todo | P1 | OpenAPI (Swagger) для публичных и приватных эндпоинтов | backend | — |
| 12.3 | Todo | P2 | Docker Compose: app + db + при необходимости nginx | / | — |
| 12.4 | Todo | P2 | CI: линт, тесты, сборка (GitHub Actions или аналог) | / | — |

---

## 13. Backend — Админка (API)

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 13.1 | Done | P1 | GET /api/admin/stats — сводка: users count, transactionsCount, transactionsSumKop, payoutsPending, payoutsSumKop (limit по периоду — день/неделя по необходимости) | app/api/admin/stats | 2025-01-25 |
| 13.2 | Done | P1 | GET /api/admin/payouts — список всех заявок (query: status?, limit, offset), с user.login и user.email | app/api/admin/payouts | 2025-01-25 |
| 13.3 | Done | P1 | PATCH /api/admin/payouts/[id] — смена статуса: PROCESSING \| COMPLETED \| REJECTED, опционально externalId | app/api/admin/payouts/[id] | 2025-01-25 |
| 13.4 | Done | P2 | GET /api/admin/users — список пользователей (query: search по login/email?, limit, offset) | app/api/admin/users | 2025-01-25 |
| 13.5 | Done | P1 | Все /api/admin/*: защита через requireRole(["ADMIN", "SUPERADMIN"]) — SUPERADMIN имеет доступ ко всем эндпоинтам ADMIN | app/api/admin/*, lib/middleware/auth.ts | 2025-01-25 |
| 13.6 | Done | P1 | POST /api/admin/users — создание админа суперадмином (вариант B): login, email?, генерация временного пароля, создание User с role=ADMIN и mustChangePassword=true, возврат временного пароля в ответе один раз | app/api/admin/users | 2025-01-25 |
| 13.7 | Done | P1 | Защита POST /api/admin/users: только requireRole(["SUPERADMIN"]) | app/api/admin/users | 2025-01-25 |

---

## 14. Frontend — Админка

| ID | Статус | Приоритет | Задача | Модуль/Файл | Обновлено |
|----|--------|-----------|--------|-------------|-----------|
| 14.1 | Done | P1 | Layout /admin: проверка role=ADMIN или SUPERADMIN (через /api/profile), при 401/403 — редирект /login, при RECIPIENT — /cabinet или главная | app/admin/layout.tsx | 2025-01-25 |
| 14.2 | Done | P1 | /admin — редирект на /admin/dashboard | app/admin/page.tsx | 2025-01-25 |
| 14.3 | Done | P1 | /admin/dashboard — карточки: пользователей, транзакций (кол-во/сумма), заявок на вывод в CREATED, сумма; сайдбар: Дашборд, Выводы, Пользователи, Выйти, в ЛК; для SUPERADMIN — дополнительно «Создать админа» | app/admin/dashboard | 2025-01-25 |
| 14.4 | Done | P1 | /admin/payouts — таблица заявок (id, user.login, amountKop, status, createdAt, details), фильтр по status, кнопки: В обработку, Выполнен, Отклонён — вызов PATCH /api/admin/payouts/[id] | app/admin/payouts | 2025-01-25 |
| 14.5 | Done | P2 | /admin/users — таблица пользователей (login, email, role, createdAt), поиск по логину/email | app/admin/users | 2025-01-25 |
| 14.6 | Done | P1 | /admin/users/create (только для SUPERADMIN) — форма создания админа: login, email?, кнопка «Создать» → POST /api/admin/users, показ временного пароля один раз (с кнопкой копирования), инструкция передать логин и пароль будущему админу | app/admin/users/create | 2025-01-25 |
| 14.7 | Done | P1 | Обязательная смена пароля: если mustChangePassword=true, при входе редирект на /change-password (отдельная страница или модалка), блокировка доступа к ЛК/админке до смены, кнопка «Отмена» недоступна | app/change-password | 2025-01-25 |
| 14.8 | Todo | P2 | Ссылка «Админка» в Header для пользователей с role=ADMIN или SUPERADMIN (опционально) | components/Header.tsx | 2025-01-25 |

---

## Заметки и блокеры

- **Auth (текущая реализация):** регистрация и вход по **логину** (не телефон). Подтверждение пароля при регистрации. SMS и шаг confirm убраны. Подробнее: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md).
- **Платёжный API:** реализация 5.3, 10.1–10.3 — после предоставления документации.
- **Футер и документы:** данные для `FOOTER_DATA.placeholder.md` (реквизиты, контакты, URL оферты/политики), тексты оферты и политики — заказчик пришлёт позже.
- **Уточнить:** лимиты и комиссии вывода, домен и бренд. SMS/email — для восстановления пароля (по желанию).
- **Админка и суперадмин:** роли ADMIN и SUPERADMIN в схеме; requireRole в lib/middleware/auth.ts. SUPERADMIN создаётся только через миграцию/seed (1.9), при первом входе обязательно меняет пароль (mustChangePassword). SUPERADMIN создаёт админов через форму в ЛК (вариант B): генерируется временный пароль, админ получает логин и пароль, при первом входе обязан сменить пароль. После смены role пользователю нужен повторный вход.

---

*Последнее обновление: 2025-01-25. Запуск только через Docker. Auth: логин, passwordConfirm, email (опц.), без SMS. Header: при входе — логин и Выйти; /login и /register при уже авторизованном — редирект в /cabinet. Админка: секции 13 (Backend) и 14 (Frontend) — реализовано. SUPERADMIN: роль выше ADMIN, создаётся только seed (prisma/seed.ts), при первом входе обязательная смена пароля. Создание админов: вариант B — суперадмин создаёт админа в /admin/users/create с временным паролем, админ обязан сменить при первом входе. Контекст: docs/PROJECT_STATUS.md*
