# API Документация

> Соответствует [PROJECT_STATUS.md](./PROJECT_STATUS.md): auth по логину, без `/api/auth/confirm`.

## Аутентификация

Все защищённые эндпоинты требуют заголовок:
```
Authorization: Bearer <access_token>
```

### POST /api/auth/register

Регистрация. Создаёт пользователя и выдаёт токены (без SMS).

**Request:**
```json
{
  "login": "ivanov",
  "password": "SecurePass123",
  "passwordConfirm": "SecurePass123",
  "email": "ivan@example.com"
}
```

`email` опционален. Логин: латиница, цифры, `_`, 3–50 символов. Пароль: минимум 8 символов, буква и цифра.

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "login": "ivanov",
    "email": "ivan@example.com",
    "role": "RECIPIENT"
  }
}
```

Refresh token — в httpOnly cookie.

**Ошибки:**
- `400` — неверные данные (в т.ч. пароли не совпадают)
- `409` — логин уже занят
- `429` — rate limit

---

### POST /api/auth/login

Вход по логину и паролю.

**Request:**
```json
{
  "login": "ivanov",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "login": "ivanov",
    "email": "ivan@example.com",
    "role": "RECIPIENT"
  }
}
```

Refresh token — в httpOnly cookie.

**Ошибки:**
- `401` — неверный логин или пароль
- `429` — rate limit

---

### POST /api/auth/refresh

Обновление пары токенов. Использует refresh token из cookie.

**Request:** без body, refresh token в cookie

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Новый refresh token сохраняется в cookie.

**Ошибки:**
- `401` — недействительный или истёкший refresh token
- `429` — rate limit

---

### POST /api/auth/logout

Выход. Инвалидирует refresh token (удаляет сессию и cookie).

**Request:** без body

**Response (200):**
```json
{
  "message": "Выход выполнен успешно"
}
```

---

## Профиль

### GET /api/profile

Данные текущего пользователя. Требует заголовок `Authorization: Bearer <access_token>`.

**Response (200):**
```json
{
  "id": "clx...",
  "login": "ivanov",
  "email": "ivan@example.com",
  "role": "RECIPIENT"
}
```

**Ошибки:**
- `401` — токен не предоставлен или недействителен

---

## Безопасность

- **Rate Limiting**: 100 запросов за 15 минут по IP
- **JWT**: Access token (15 мин), Refresh token (7 дней, httpOnly cookie)
- **Пароли**: bcrypt с 12 раундами
- **Валидация**: Zod для всех входных данных

---

## Примеры

### Регистрация и вход

```typescript
// Регистрация
const registerRes = await fetch("/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    login: "ivanov",
    password: "SecurePass123",
    passwordConfirm: "SecurePass123",
    email: "ivan@example.com",
  }),
  credentials: "include",
});

const { accessToken, user } = await registerRes.json();

// Вход
const loginRes = await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ login: "ivanov", password: "SecurePass123" }),
  credentials: "include",
});

const { accessToken } = await loginRes.json();

// Защищённый запрос
await fetch("/api/profile", {
  headers: { "Authorization": `Bearer ${accessToken}` },
});
```

---

*Документация будет дополняться (профиль, ссылки, транзакции, выводы).*
