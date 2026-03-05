import crypto from "crypto";

const REGISTRATION_TOKEN_BYTES = 24;

/** Срок действия токена не ограничен по времени (одноразовое использование). В БД храним дату далеко в будущем. */
const REGISTRATION_TOKEN_EXPIRY_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 лет

export function getRegistrationTokenExpiresAt(): Date {
  return new Date(Date.now() + REGISTRATION_TOKEN_EXPIRY_MS);
}

export function generateRegistrationToken(): string {
  return crypto.randomBytes(REGISTRATION_TOKEN_BYTES).toString("base64url");
}

export function hashRegistrationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
