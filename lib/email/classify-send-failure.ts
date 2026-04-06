/**
 * Краткое сообщение для UI + сырой ответ провайдера (для суперадмина, без секретов в тексте).
 */

export type ClassifiedSendFailure = { summary: string; detail: string };

export function classifySendEmailFailure(raw: string): ClassifiedSendFailure {
  const detail = raw.replace(/\s+/g, " ").trim().slice(0, 500);
  const lower = raw.toLowerCase();

  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("таймаут")) {
    return { summary: "Таймаут при обращении к почтовому серверу. Повторите позже.", detail };
  }
  if (
    lower.includes("auth") ||
    lower.includes("535") ||
    lower.includes("534") ||
    lower.includes("authentication failed") ||
    lower.includes("invalid login")
  ) {
    return {
      summary: "Ошибка входа на SMTP (логин или пароль приложения). Проверьте SMTP_USER / SMTP_PASS.",
      detail,
    };
  }
  if (lower.includes("econnrefused") || lower.includes("enotfound") || lower.includes("getaddrinfo")) {
    return { summary: "Не удаётся подключиться к SMTP_HOST (сеть или DNS).", detail };
  }
  if (
    lower.includes("domain") &&
    (lower.includes("verify") || lower.includes("verified") || lower.includes("not allowed"))
  ) {
    return {
      summary: "Ограничение провайдера (Resend и др.): домен отправителя или получатель не разрешены.",
      detail,
    };
  }
  if (lower.includes("only send") && lower.includes("testing")) {
    return {
      summary: "Режим теста Resend: можно слать только на разрешённые адреса. Проверьте домен в Resend.",
      detail,
    };
  }

  return {
    summary:
      "Почтовый сервер не принял письмо на этот адрес. Часто это фильтр Mail.ru / полный ящик / неверный ящик — ниже ответ сервера.",
    detail,
  };
}
