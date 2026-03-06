/**
 * Шаблоны писем для отправки через sendEmail().
 * Настраивайте текст, заголовки и оформление здесь — все рассылки используют эти шаблоны.
 */

import { getAppUrl } from "@/lib/config";

/** Экранирует HTML, чтобы подставляемый текст не мог внедрить разметку (XSS в письме). */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Проверяет, что ссылка — https и с разрешённого origin (NEXT_PUBLIC_APP_URL), и экранирует для href.
 * Относительные пути (начинаются с /) допускаются и только экранируются (для dev).
 */
function safeLinkForEmail(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    return escapeHtml(trimmed);
  }
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

/** Письмо со ссылкой сброса пароля (страница «Забыли пароль») */
export function templatePasswordReset(params: { resetLink: string }) {
  const safeHref = safeLinkForEmail(params.resetLink);
  const subject = "Сброс пароля — FreeTips";
  const html = `
    <p>Здравствуйте!</p>
    <p>Вы запросили сброс пароля в сервисе FreeTips.</p>
    <p><a href="${safeHref}">Перейти к сбросу пароля</a></p>
    <p>Ссылка действительна 1 час. Если вы не запрашивали сброс, срочно свяжитесь с нами.</p>
  `;
  return { subject, html };
}

/** Письмо с кодом подтверждения email при регистрации (6 цифр) */
export function templateEmailVerificationCode(params: { code: string }) {
  const subject = "Код подтверждения email — FreeTips";
  const html = `
    <p>Ваш код подтверждения для регистрации в FreeTips:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(params.code)}</p>
    <p>Код действителен 10 минут. Если вы не запрашивали код, проигнорируйте это письмо.</p>
  `;
  return { subject, html };
}

/** Письмо со ссылкой регистрации после одобрения заявки (админ → «Выслать токен») */
export function templateRegistrationLinkFromRequest(params: {
  link: string;
  fullName?: string | null;
  expiresAt: Date;
}) {
  const safeHref = safeLinkForEmail(params.link);
  const subject = "Ссылка для регистрации — FreeTips";
  const html = `
    <p>Здравствуйте${params.fullName ? `, ${escapeHtml(params.fullName)}` : ""}!</p>
    <p>Ваша заявка на подключение к сервису чаевых FreeTips одобрена.</p>
    <p><a href="${safeHref}">Перейти к регистрации</a></p>
    <p>Ссылка одноразовая — действует только на одну регистрацию. Срок действия — до ${params.expiresAt.toLocaleString("ru-RU")}.</p>
    <p>Если вы не оставляли заявку, проигнорируйте это письмо.</p>
  `;
  return { subject, html };
}

/** Приглашение официанта (управляющий → отправить приглашение по email) */
export function templateInviteEmployee(params: {
  link: string;
  employeeName?: string | null;
  expiresAt: Date;
}) {
  const safeHref = safeLinkForEmail(params.link);
  const subject = "Приглашение в FreeTips — регистрация как официант";
  const html = `
    <p>Здравствуйте!</p>
    <p>Вам направлена ссылка для регистрации в сервисе чаевых FreeTips (как официант${params.employeeName ? ` — ${escapeHtml(params.employeeName)}` : ""}).</p>
    <p><a href="${safeHref}">Перейти к регистрации</a></p>
    <p>Ссылка действительна до ${params.expiresAt.toLocaleString("ru-RU")}.</p>
    <p>Если вы не запрашивали приглашение, проигнорируйте это письмо.</p>
  `;
  return { subject, html };
}
