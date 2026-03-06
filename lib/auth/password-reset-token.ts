/**
 * Токен сброса пароля: генерация, хеш, срок действия (1 час).
 */

import crypto from "crypto";

const TOKEN_BYTES = 24;
const EXPIRY_MS = 60 * 60 * 1000; // 1 час

export function getPasswordResetTokenExpiresAt(): Date {
  return new Date(Date.now() + EXPIRY_MS);
}

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
