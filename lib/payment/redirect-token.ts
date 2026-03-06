/**
 * Токен для безопасного редиректа на Paygine через /api/pay/redirect-proxy.
 * Прокси принимает только tid + токен, подписанный сервером, и сам собирает форму.
 */

import { createHmac, timingSafeEqual } from "crypto";

const PAY_REDIRECT_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 минут
const PAY_REDIRECT_TOKEN_SEPARATOR = ".";

function getSecret(): string {
  const s = process.env.JWT_SECRET ?? process.env.PAY_REDIRECT_SECRET;
  if (!s || typeof s !== "string") throw new Error("JWT_SECRET или PAY_REDIRECT_SECRET должен быть задан");
  return s;
}

/** Создаёт подписанный токен для редиректа по транзакции (tid). Вызывать только на сервере. */
export function createPayRedirectToken(tid: string): string {
  const secret = getSecret();
  const expiry = (Date.now() + PAY_REDIRECT_TOKEN_TTL_MS).toString(36);
  const payload = `${tid}${PAY_REDIRECT_TOKEN_SEPARATOR}${expiry}`;
  const sig = createHmac("sha256", secret).update(payload, "utf8").digest("hex").slice(0, 32);
  return `${payload}${PAY_REDIRECT_TOKEN_SEPARATOR}${sig}`;
}

/** Проверяет токен и возвращает tid при успехе, иначе null. */
export function verifyPayRedirectToken(token: string): string | null {
  try {
    const secret = getSecret();
    const parts = token.split(PAY_REDIRECT_TOKEN_SEPARATOR);
    if (parts.length !== 3) return null;
    const [tid, expiryStr, sig] = parts;
    if (!tid || !expiryStr || !sig) return null;
    const expiry = parseInt(expiryStr, 36);
    if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
    const payload = `${tid}${PAY_REDIRECT_TOKEN_SEPARATOR}${expiryStr}`;
    const expected = createHmac("sha256", secret).update(payload, "utf8").digest("hex").slice(0, 32);
    if (expected.length !== sig.length || !/^[a-f0-9]+$/i.test(sig)) return null;
    const bufExpected = Buffer.from(expected, "hex");
    const bufSig = Buffer.from(sig, "hex");
    if (bufExpected.length !== bufSig.length || !timingSafeEqual(bufExpected, bufSig)) return null;
    return tid;
  } catch {
    return null;
  }
}
