/**
 * Разбор списка ID пользователей для массовых операций в админке.
 * Поддерживает uniqueId, user.id, login, код официанта (000-123), `#123`, `ID: #123`.
 */

export function normalizeBulkUserIdToken(raw: string): string {
  let token = raw.trim();
  token = token.replace(/^id\s*:\s*/i, "");
  if (token.startsWith("#")) {
    token = token.slice(1).trim();
  }
  return token;
}

/** NNN-NNN или шесть цифр подряд → slug для tip_links.slug / qrCodeIdentifier. */
export function toWaiterCodeSlug(token: string): string | null {
  const t = normalizeBulkUserIdToken(token);
  if (/^\d{3}-\d{3}$/.test(t)) return t;
  if (/^\d{6}$/.test(t)) {
    return `${t.slice(0, 3)}-${t.slice(3)}`;
  }
  return null;
}

export function parseBulkUserIdTokens(raw: string): string[] {
  const tokens = raw
    .split(/[\s,;]+/)
    .map(normalizeBulkUserIdToken)
    .filter(Boolean);
  return Array.from(new Set(tokens));
}
