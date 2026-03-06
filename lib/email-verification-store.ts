/**
 * Хранилище кодов подтверждения email при регистрации.
 * In-memory (при нескольких инстансах нужен Redis — можно добавить по аналогии с rate-limit-redis).
 * Код: 6 цифр, TTL 10 мин. Флаг «подтверждён»: TTL 15 мин.
 */

const CODE_TTL_MS = 10 * 60 * 1000;   // 10 минут
const VERIFIED_TTL_MS = 15 * 60 * 1000; // 15 минут

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const codeStore = new Map<string, { code: string; expiresAt: number }>();
const verifiedStore = new Map<string, number>(); // email -> expiresAt

function cleanupCodes(): void {
  const now = Date.now();
  for (const [key, v] of codeStore.entries()) {
    if (v.expiresAt <= now) codeStore.delete(key);
  }
  for (const [key, exp] of verifiedStore.entries()) {
    if (exp <= now) verifiedStore.delete(key);
  }
}

export function setEmailVerificationCode(email: string, code: string): void {
  const key = normalizeEmail(email);
  codeStore.set(key, { code, expiresAt: Date.now() + CODE_TTL_MS });
}

export function checkAndConsumeEmailCode(email: string, code: string): boolean {
  cleanupCodes();
  const key = normalizeEmail(email);
  const entry = codeStore.get(key);
  if (!entry || entry.expiresAt <= Date.now()) return false;
  if (entry.code !== code.trim()) return false;
  codeStore.delete(key);
  verifiedStore.set(key, Date.now() + VERIFIED_TTL_MS);
  return true;
}

export function isEmailVerified(email: string): boolean {
  cleanupCodes();
  const key = normalizeEmail(email);
  const exp = verifiedStore.get(key);
  return exp != null && exp > Date.now();
}

export function consumeEmailVerified(email: string): boolean {
  const key = normalizeEmail(email);
  const exp = verifiedStore.get(key);
  if (exp == null || exp <= Date.now()) return false;
  verifiedStore.delete(key);
  return true;
}
