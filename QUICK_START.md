# Быстрый старт

Проект запускается **только через Docker**.

## Запуск

```bash
docker compose up --build
```

Сервисы: [http://localhost:3000](http://localhost:3000) (web), PostgreSQL на 5432.

При старте `web` выполняется `prisma db push` — схема БД применяется к PostgreSQL автоматически.

## .env

Скопируй `.env.example` в `.env` и задай:

- `JWT_SECRET`, `JWT_REFRESH_SECRET` — обязательно (например: `openssl rand -base64 32`)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — по желанию (есть значения по умолчанию)

`DATABASE_URL` задавать не нужно — в контейнере `web` он собирается из `POSTGRES_*` и хоста `db`.

---

## Проверка auth (регистрация и вход)

1. **Регистрация** — [http://localhost:3000/register](http://localhost:3000/register):
   - Логин (латиница, цифры, `_`, 3–50 символов)
   - Email (опционально)
   - Пароль (мин. 8 символов, буква и цифра)
   - Подтверждение пароля
   - Кнопка «Зарегистрироваться» → редирект в `/cabinet`.

2. **Вход** — [http://localhost:3000/login](http://localhost:3000/login):
   - Логин + пароль → «Войти» → `/cabinet`.

3. **Кабинет** — [http://localhost:3000/cabinet](http://localhost:3000/cabinet):
   - Профиль (логин, email), «Выйти».

**Шапка:** при входе — логин и «Выйти»; иначе «Регистрация» и «Войти». **/login и /register** при уже авторизованном пользователе перенаправляют в /cabinet.

---

## Если страницы не отображаются

- Убедись, что `docker compose up` выполнен и контейнер `web` запущен, порт 3000 свободен.
- Проверь логи: `docker compose logs web`.
- Проверь `.env`: `JWT_SECRET`, `JWT_REFRESH_SECRET`.
- Hard refresh: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Win/Linux) или режим инкогнито.

---

## Prisma: миграции и Studio

**Создать миграцию** (добавить файл в `prisma/migrations/`):

```bash
docker compose run --rm web sh -c "prisma migrate dev --name init"
```

**Применить миграции** (вместо `db push`, если используешь миграции):

```bash
docker compose exec web sh -c "prisma migrate deploy"
```

**Prisma Studio** (GUI для БД):

```bash
docker compose run --rm -p 5555:5555 web sh -c "prisma studio"
```

Откроется на http://localhost:5555
