/**
 * TOTP для админов (Google Authenticator и совместимые приложения).
 * otplib v13: generateSecret, generateURI, verifySync.
 */

import { generateSecret, generateURI, verifySync } from "otplib";
import { decryptTotpSecret } from "@/lib/auth/totp-crypto";

const ISSUER = "1tips Admin";

export function generateTotpSecretBase32(): string {
  return generateSecret();
}

export function buildAdminOtpauthUri(login: string, secretBase32: string): string {
  return generateURI({ issuer: ISSUER, label: login, secret: secretBase32 });
}

export function verifyTotpCode(secretBase32: string, token: string): boolean {
  const trimmed = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  try {
    const result = verifySync({
      secret: secretBase32,
      token: trimmed,
      epochTolerance: 30,
    });
    return result.valid === true;
  } catch {
    return false;
  }
}

export function verifyTotpWithEncryptedSecret(adminTotpSecretEnc: string | null, token: string): boolean {
  if (!adminTotpSecretEnc) return false;
  const secret = decryptTotpSecret(adminTotpSecretEnc);
  if (!secret) return false;
  return verifyTotpCode(secret, token);
}
