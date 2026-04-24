/** Подпись получателя на странице оплаты: «Должность (как зовут)». */

const DEFAULT_PAY_JOB_TITLE = "Официант";

export function firstNameFromFullName(fullName: string | null | undefined): string {
  const t = (fullName ?? "").trim();
  if (!t) return "";
  const parts = t.split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts[1]! : parts[0] ?? t;
}

export function resolvePayClientNickPart(opts: {
  clientNickname?: string | null;
  fullName?: string | null;
  employeeName?: string | null;
  login: string;
}): string {
  const nick = opts.clientNickname?.trim();
  if (nick) return nick;
  const fromFull = firstNameFromFullName(opts.fullName);
  if (fromFull) return fromFull;
  const emp = opts.employeeName?.trim();
  if (emp) return emp;
  const login = opts.login.trim();
  if (login) return login;
  return "Получатель";
}

export function resolvePayClientJobTitle(clientJobTitle?: string | null): string {
  const t = clientJobTitle?.trim();
  return t || DEFAULT_PAY_JOB_TITLE;
}

export function formatPayRecipientClientLabel(opts: {
  clientNickname?: string | null;
  clientJobTitle?: string | null;
  fullName?: string | null;
  employeeName?: string | null;
  login: string;
}): string {
  const job = resolvePayClientJobTitle(opts.clientJobTitle);
  const nick = resolvePayClientNickPart(opts);
  return `${job} (${nick})`;
}
