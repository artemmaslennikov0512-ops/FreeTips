/**
 * Отправка писем: Resend API или SMTP (Mail.ru, Яндекс, свой сервер).
 * Приоритет: если задан SMTP_HOST — используем SMTP, иначе RESEND_API_KEY — Resend.
 */

import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Опционально: plain-text версия письма (для клиентов без HTML). */
  text?: string;
  from?: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

/** Проверка: задана ли хотя бы одна конфигурация почты (для диагностики без раскрытия секретов). */
export function isMailConfigured(): boolean {
  return getMailProvider() !== "none";
}

function getMailProvider(): "smtp" | "resend" | "none" {
  const smtpHost = process.env.SMTP_HOST?.trim();
  if (smtpHost) return "smtp";
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) return "resend";
  return "none";
}

/** Отправить письмо. Возвращает { ok: true } или { ok: false, error }. Если почта не настроена — { ok: false, error: "..." }. */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html } = options;

  const smtpHost = process.env.SMTP_HOST?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (smtpHost) {
    return sendViaSmtp({ to, subject, html, text: options.text, from: options.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER });
  }

  if (resendKey) {
    return sendViaResend({ to, subject, html, text: options.text, from: options.from ?? process.env.RESEND_FROM ?? "FreeTips <onboarding@resend.dev>" });
  }

  return {
    ok: false,
    error:
      "Почта не настроена: задайте SMTP_HOST (и SMTP_USER, SMTP_PASS) или RESEND_API_KEY в .env. Без пробелов в начале строки. После изменения .env перезапустите сервер.",
  };
}

async function sendViaSmtp(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!from) {
    return { ok: false, error: "Укажите SMTP_FROM или SMTP_USER в .env" };
  }

  const host = process.env.SMTP_HOST!;
  const portRaw = parseInt(process.env.SMTP_PORT ?? "465", 10);
  const port = Number.isInteger(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 465;
  const secure = process.env.SMTP_SECURE !== "false" && port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    return { ok: false, error: "Укажите SMTP_USER и SMTP_PASS в .env" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text }),
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

const RESEND_FETCH_TIMEOUT_MS = 15_000;

async function sendViaResend(options: SendEmailOptions & { from: string }): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text && { text: options.text }),
      }),
      signal: AbortSignal.timeout(RESEND_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      let errorMessage = "";
      if (contentType.includes("application/json")) {
        const body = (await res.json()) as { message?: string; msg?: string };
        errorMessage = body.message ?? body.msg ?? "";
      }
      if (!errorMessage) {
        errorMessage = await res.text();
      }
      return { ok: false, error: (errorMessage || `Resend ${res.status}`).trim() };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error) {
      const isTimeout = err.name === "TimeoutError" || err.message.includes("timeout");
      return { ok: false, error: isTimeout ? "Таймаут запроса к Resend (15 с)" : err.message };
    }
    return { ok: false, error: String(err) };
  }
}
