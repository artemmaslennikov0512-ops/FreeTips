# Prisma: схема и миграции

Проект использует **Prisma 6**. Схема с `url = env("DATABASE_URL")` в `datasource` — формат Prisma 6; Prisma 7 требует `prisma.config.ts` и другой формат.

Запуск **только через Docker**. Все команды Prisma выполняются в контейнере `web` (в нём установлен `prisma@6`).

## Схема БД

Модели в `schema.prisma`:
- **User** — пользователи (получатели чаевых)
- **Session** — сессии (refresh tokens)
- **TipLink** — уникальные ссылки для приёма чаевых
- **Transaction** — транзакции (чаевые), суммы в копейках (BigInt)
- **PayoutRequest** — заявки на вывод средств

## Применение схемы при старте

При старте контейнера `web` выполняется `prisma db push` — таблицы создаются или обновляются по `schema.prisma` без файлов миграций.

## Миграции (опционально)

**Создать миграцию** (добавить SQL в `prisma/migrations/`):

```bash
docker compose run --rm web sh -c "prisma migrate dev --name init"
```

**Применить миграции** (если используете миграции вместо `db push`):

```bash
docker compose exec web sh -c "prisma migrate deploy"
```

## Prisma Studio (GUI для БД)

```bash
docker compose run --rm -p 5555:5555 web sh -c "prisma studio"
```

Откроется на http://localhost:5555

## Безопасность

- **Суммы в копейках**: `amountKop` (BigInt)
- **Идемпотентность**: `idempotencyKey` в Transaction
- **Индексы**: по userId, status, createdAt

## Пример в коде

```typescript
import { db } from "@/lib/db";

const user = await db.user.create({
  data: {
    login: "ivanov",
    passwordHash: hashedPassword,
    email: "ivan@example.com",
    role: "RECIPIENT",
  },
});
```
