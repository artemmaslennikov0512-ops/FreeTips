/**
 * Генерация URL-safe slug для TipLink.
 * Только для использования в серверном коде (Node.js, API routes).
 */

import { randomBytes } from "crypto";

const SLUG_LENGTH = 10;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Генерирует короткий URL-safe slug.
 * [a-z0-9], 10 символов, криптостойкий источник случайности.
 */
export function generateSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH);
  let s = "";
  for (let i = 0; i < SLUG_LENGTH; i++) {
    s += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return s;
}
