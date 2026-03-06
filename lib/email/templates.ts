/**
 * Шаблоны писем для отправки через sendEmail().
 * Настраивайте текст, заголовки и оформление здесь — все рассылки используют эти шаблоны.
 * Визуализация: общий layout, кнопки, типографика, совместимость с почтовыми клиентами.
 */

import { getAppUrl } from "@/lib/config";

/** Результат шаблона письма: subject и html для sendEmail(). */
export type EmailTemplateResult = { subject: string; html: string };

const APP_NAME = "FreeTips";

/** Экранирует HTML (XSS-защита в письме). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Форматирует дату для отображения в письме (ru-RU). */
function formatDateRu(date: Date): string {
  return date.toLocaleString("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

/**
 * Проверяет, что ссылка — https и с разрешённого origin (NEXT_PUBLIC_APP_URL), и экранирует для href.
 * Относительные пути (начинаются с /) допускаются и только экранируются (для dev).
 */
function safeLinkForEmail(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) return escapeHtml(trimmed);
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:") return "#";
    const appUrl = getAppUrl();
    if (appUrl) {
      const base = new URL(appUrl.startsWith("http") ? appUrl : `https://${appUrl}`);
      if (u.origin !== base.origin) return "#";
    }
    return escapeHtml(trimmed);
  } catch {
    return "#";
  }
}

/** Стили для совместимости с почтовыми клиентами (inline). */
const styles = {
  wrapper:
    "margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen-Sans,Ubuntu,sans-serif;font-size:16px;line-height:1.6;color:#18181b;",
  container:
    "max-width:560px;margin:0 auto;padding:32px 24px;",
  card:
    "background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);padding:32px 28px;margin-bottom:24px;",
  header:
    "font-size:22px;font-weight:700;color:#18181b;margin:0 0 24px 0;letter-spacing:-0.02em;",
  paragraph:
    "margin:0 0 16px 0;color:#3f3f46;",
  muted:
    "margin:0;font-size:14px;color:#71717a;",
  button:
    "display:inline-block;margin:20px 0;padding:14px 28px;background:#18181b;color:#ffffff !important;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;",
  codeBox:
    "display:inline-block;margin:16px 0;padding:16px 24px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;font-size:28px;font-weight:700;letter-spacing:6px;color:#18181b;font-family:ui-monospace,monospace;",
  footer:
    "text-align:center;padding-top:20px;border-top:1px solid #e4e4e7;margin-top:24px;",
  footerText:
    "margin:0;font-size:13px;color:#71717a;",
} as const;

/** Обёртка письма: header приложения + контент + footer. */
function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(APP_NAME)}</title>
</head>
<body style="${styles.wrapper}">
  <div style="${styles.container}">
    <div style="${styles.card}">
      <h1 style="${styles.header}">${escapeHtml(APP_NAME)}</h1>
      ${content}
    </div>
    <p style="${styles.footer}${styles.footerText}">Это письмо отправлено сервисом ${escapeHtml(APP_NAME)}. Если вы не ожидали его — проигнорируйте.</p>
  </div>
</body>
</html>`.replace(/\n\s+/g, "\n").trim();
}

/** Письмо со ссылкой сброса пароля (страница «Забыли пароль») */
export function templatePasswordReset(params: { resetLink: string }): EmailTemplateResult {
  const safeHref = safeLinkForEmail(params.resetLink);
  const subject = `Сброс пароля — ${APP_NAME}`;
  const html = wrapEmail(`
    <p style="${styles.paragraph}">Здравствуйте!</p>
    <p style="${styles.paragraph}">Вы запросили сброс пароля в сервисе ${APP_NAME}. Нажмите кнопку ниже, чтобы задать новый пароль.</p>
    <p style="text-align:center;"><a href="${safeHref}" style="${styles.button}">Сбросить пароль</a></p>
    <p style="${styles.muted}">Ссылка действительна 1 час. Если вы не запрашивали сброс, срочно свяжитесь с нами.</p>
  `);
  return { subject, html };
}

/** Письмо с кодом подтверждения email при регистрации (6 цифр) */
export function templateEmailVerificationCode(params: { code: string }): EmailTemplateResult {
  const subject = `Код подтверждения email — ${APP_NAME}`;
  const html = wrapEmail(`
    <p style="${styles.paragraph}">Ваш код подтверждения для регистрации в ${APP_NAME}:</p>
    <p style="text-align:center;"><span style="${styles.codeBox}">${escapeHtml(params.code)}</span></p>
    <p style="${styles.muted}">Код действителен 10 минут. Если вы не запрашивали код, проигнорируйте это письмо.</p>
  `);
  return { subject, html };
}

/** Письмо со ссылкой регистрации после одобрения заявки (админ → «Выслать токен») */
export function templateRegistrationLinkFromRequest(params: {
  link: string;
  fullName?: string | null;
  expiresAt: Date;
}): EmailTemplateResult {
  const safeHref = safeLinkForEmail(params.link);
  const subject = `Ссылка для регистрации — ${APP_NAME}`;
  const html = wrapEmail(`
    <p style="${styles.paragraph}">Здравствуйте${params.fullName ? `, ${escapeHtml(params.fullName)}` : ""}!</p>
    <p style="${styles.paragraph}">Ваша заявка на подключение к сервису чаевых ${APP_NAME} одобрена. Перейдите по ссылке ниже, чтобы завершить регистрацию.</p>
    <p style="text-align:center;"><a href="${safeHref}" style="${styles.button}">Перейти к регистрации</a></p>
    <p style="${styles.muted}">Ссылка одноразовая. Срок действия — до ${formatDateRu(params.expiresAt)}. Если вы не оставляли заявку, проигнорируйте это письмо.</p>
  `);
  return { subject, html };
}

/** Приглашение официанта (управляющий → отправить приглашение по email) */
export function templateInviteEmployee(params: {
  link: string;
  employeeName?: string | null;
  expiresAt: Date;
}): EmailTemplateResult {
  const safeHref = safeLinkForEmail(params.link);
  const subject = `Приглашение в ${APP_NAME} — регистрация как официант`;
  const html = wrapEmail(`
    <p style="${styles.paragraph}">Здравствуйте!</p>
    <p style="${styles.paragraph}">Вам направлена ссылка для регистрации в сервисе чаевых ${APP_NAME}${params.employeeName ? ` (как официант — ${escapeHtml(params.employeeName)})` : " как официант"}.</p>
    <p style="text-align:center;"><a href="${safeHref}" style="${styles.button}">Перейти к регистрации</a></p>
    <p style="${styles.muted}">Ссылка действительна до ${formatDateRu(params.expiresAt)}. Если вы не запрашивали приглашение, проигнорируйте это письмо.</p>
  `);
  return { subject, html };
}
