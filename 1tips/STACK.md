# Стек технологий

## Выбор

| Категория | Инструмент | Версия | Обоснование (безопасность, надёжность) |
|-----------|------------|--------|----------------------------------------|
| **Framework** | Next.js | 16.x | React, App Router, Turbopack, встроенные security-заголовки, активная поддержка |
| **Язык** | TypeScript | 5.x | Strict mode, статический анализ, меньше runtime-ошибок |
| **Стили** | Tailwind CSS | 4.x | @theme в CSS, @tailwindcss/postcss, без runtime |
| **Иконки** | Lucide React | latest | Tree-shakeable, популярный форк Feather, регулярные обновления |
| **Шрифты** | next/font (Plus Jakarta Sans) | — | Self-hosted, нет запросов к Google, контроль над загрузкой |
| **Валидация** | Zod | 3.x | Без eval, неизменяемые схемы, малый размер, рекомендуется для API |
| **ORM** | Prisma | 6.x | Type-safe, миграции, генерация клиента, безопасность по умолчанию |
| **Сборка/запуск** | Node.js | 20 LTS | LTS, долгая поддержка безопасности |

## Инфраструктура

| Категория | Инструмент | Назначение |
|-----------|------------|------------|
| **Контейнеризация** | Docker | Обязательно по ТЗ; изолированная среда, воспроизводимость |
| **БД** | PostgreSQL | 16-alpine в docker-compose; типичный выбор для FinTech, ACID, аудит |

## Безопасность зависимостей

- **npm audit** — перед релизом, устранение critical/high.
- **Lockfile** — `package-lock.json` в репозитории, фиксированные версии при сборке в Docker.
- **Минимум зависимостей** — только проверенные, широко используемые пакеты; избегаем цепочек с непроверенными maintainers.

## Структура

```
app/           — App Router (Next.js 16), страницы и API routes
components/    — переиспользуемые UI (Header, Footer, секции лендинга)
config/        — site.ts (футер, нав, данные из FOOTER_DATA)
lib/           — утилиты: db.ts (Prisma Client), validations.ts (Zod), utils.ts (деньги)
prisma/        — schema.prisma, миграции
public/        — статика, логотип
```

## Docker

- **Dockerfile** — multi-stage: deps → build → production (standalone Next.js). При старте: `prisma db push`, затем `node server.js`.
- **docker-compose** — сервисы `web` (Next.js), `db` (PostgreSQL). Запуск только через `docker compose up --build`.

---

*Auth (логин, без телефона/SMS) реализован. Профиль, ссылки, платёжный модуль — по TODO.md.*
