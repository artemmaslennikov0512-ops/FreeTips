# Снимок до прямого POST на Paygine (2026-04-07)

Сохранено перед изменением потока оплаты: вместо перехода на `/pay/redirect` клиент может сразу отправлять форму на `/api/pay/redirect-proxy` с `redirectToken` из ответа `POST /api/pay/[slug]`.

## Откат кода

```bash
git checkout -- app/api/pay/[slug]/route.ts app/pay/[slug]/PayPageClient.tsx scripts/load-test-payments-e2e.ts
```

Либо откатить коммит, в котором внесены эти правки.

Страница `app/pay/redirect/page.tsx` после отката остаётся рабочей точкой входа по старой ссылке `redirectUrl`.

## Секреты и окружение (не коммитить значения)

На проде **скопируйте актуальный `.env`** (или переменные в панели хостинга) в безопасное место вне репозитория, например:

- `payment-env-backup-2026-04-07.env` на защищённом диске / в менеджере секретов.

Имена переменных, влияющих на **пополнение (приём)** и **выплаты / Paygine** (см. также `.env.example`):

| Переменная | Назначение |
|------------|------------|
| `JWT_SECRET` | Подпись сессий; также используется для `redirectToken` редиректа на оплату (или `PAY_REDIRECT_SECRET`) |
| `PAY_REDIRECT_SECRET` | Опционально: отдельный секрет для токена редиректа на Paygine |
| `NEXT_PUBLIC_APP_URL` | Публичный URL сайта (редиректы Paygine, success/fail) |
| `PAYGINE_BASE_URL` | База API Paygine (прод/тест) |
| `PAYGINE_SECTOR` | Сектор |
| `PAYGINE_PASSWORD` | Пароль сектора |
| `PAYGINE_SD_REF` | Опционально, sd_ref |
| `PAYGINE_SD_REF_LEGAL` | Кубышка ЮЛ для комиссий при переливе |
| `PAYGINE_REQUEST_TIMEOUT_MS` | Таймаут HTTP к ПЦ |
| `PAYGINE_RELOCATE_DELAY_MS` | Задержка перед Relocate после оплаты |
| `PAYGINE_RELOCATE_RETRY_MS` | Интервал повтора Relocate |
| `PAYGINE_RELOCATE_QUEUE_CONCURRENCY` | Параллельные переливы |
| `WEBHOOK_RATE_LIMIT_MAX` | Лимит POST вебхука с IP |
| `PAYMENT_WEBHOOK_SECRET` | Подпись внешнего вебхука (если используется) |
| `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET` | См. `.env.example` |

## Поведение до изменения

1. Успешный `POST /api/pay/[slug]` возвращал `redirectUrl` → `/pay/redirect?tid=…`.
2. Пользователь открывал эту страницу; сервер создавал `redirectToken` и авто-submit на `/api/pay/redirect-proxy`.
3. Прокси отдавал HTML с авто-submit на форму Paygine.

## Ключевые файлы потока (без изменения бизнес-логики Paygine)

- `lib/payment/paygine-gateway.ts` — регистрация заказа, `redirectUrl`
- `app/api/pay/redirect-proxy/route.ts` — сборка формы SDPayIn
- `lib/payment/redirect-token.ts` — TTL токена 5 минут
- `app/pay/redirect/page.tsx` — резервный вход по `redirectUrl`
