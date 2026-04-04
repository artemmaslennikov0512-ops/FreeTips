/**
 * AES-256-GCM для хранения кодового слова в БД в расшифровываемом виде (только показ в админке).
 * Тот же формат и ключ, что в totp-crypto (TOTP_ENCRYPTION_KEY / JWT_SECRET).
 */

import { decryptTotpSecret, encryptTotpSecret } from "./totp-crypto";

export function encryptRecoveryCodewordForAdminDisplay(plain: string): string {
  return encryptTotpSecret(plain);
}

export function decryptRecoveryCodewordForAdminDisplay(enc: string | null | undefined): string | null {
  if (!enc) return null;
  return decryptTotpSecret(enc);
}
