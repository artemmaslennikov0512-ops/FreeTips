import { randomBytes } from "crypto";

/** Генерирует криптостойкий API-ключ (64 hex-символа). */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex");
}
