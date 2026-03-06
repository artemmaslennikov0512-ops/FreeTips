# Письма (email)

## Где настраивать шаблоны

**Файл: `lib/email/templates.ts`**

В нём заданы все тексты писем:

| Шаблон | Когда отправляется |
|--------|---------------------|
| `templatePasswordReset` | Ссылка сброса пароля («Забыли пароль») |
| `templateEmailVerificationCode` | Код 6 цифр для подтверждения email при регистрации |
| `templateRegistrationLinkFromRequest` | Ссылка регистрации после одобрения заявки («Выслать токен») |
| `templateInviteEmployee` | Приглашение официанта (управляющий → отправить по email) |

Меняйте в `templates.ts` заголовок (`subject`), HTML-текст и оформление — рассылки подхватят изменения без правок в API.

## Отправка (SMTP / Resend)

Настройка в `.env`: см. [MAILRU_SMTP_SETUP.md](../../docs/MAILRU_SMTP_SETUP.md) или переменные `SMTP_*` / `RESEND_*`.  
Логика отправки: `lib/email/send.ts`.
