import { createHash, randomBytes } from "crypto";

const PREFIX_LENGTH = 16;

/** Генерирует криптостойкий API-ключ (64 hex-символа). */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}

/** Префикс ключа для поиска в БД (первые 16 символов). */
export function getApiKeyPrefix(key: string): string {
  return key.slice(0, PREFIX_LENGTH);
}

/** SHA-256 ключа в hex (64 символа). */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}
