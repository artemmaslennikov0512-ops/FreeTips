/**
 * Отправка писем: Resend API или SMTP (Mail.ru, Яндекс, свой сервер).
 * Приоритет: если задан SMTP_HOST — используем SMTP, иначе RESEND_API_KEY — Resend.
 */

import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

/** Отправить письмо. Возвращает { ok: true } или { ok: false, error }. Если почта не настроена — { ok: false, error: "..." }. */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html } = options;

  const smtpHost = process.env.SMTP_HOST?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (smtpHost) {
    return sendViaSmtp({ to, subject, html, from: options.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER });
  }

  if (resendKey) {
    return sendViaResend({ to, subject, html, from: options.from ?? process.env.RESEND_FROM ?? "FreeTips <onboarding@resend.dev>" });
  }

  return { ok: false, error: "Почта не настроена: задайте SMTP_* или RESEND_API_KEY" };
}

async function sendViaSmtp(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from ?? process.env.SMTP_FROM ?? process.env.SMTP_USER;
  if (!from) {
    return { ok: false, error: "Укажите SMTP_FROM или SMTP_USER в .env" };
  }

  const host = process.env.SMTP_HOST!;
  const port = parseInt(process.env.SMTP_PORT ?? "465", 10);
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
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function sendViaResend(options: SendEmailOptions & { from: string }): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY!.trim();

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
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text || `Resend ${res.status}` };
  }

  return { ok: true };
}
