/**
 * AES-256-GCM шифрование секрета TOTP для хранения в БД.
 * Ключ: TOTP_ENCRYPTION_KEY (hex, 64 символа) или SHA-256(JWT_SECRET + суффикс).
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getJwtSecret } from "@/lib/config";

const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey32(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY?.trim();
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  return createHash("sha256").update(`${getJwtSecret()}\0admin-totp-v1`, "utf8").digest();
}

export function encryptTotpSecret(plainUtf8: string): string {
  const key = getKey32();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plainUtf8, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptTotpSecret(encBase64url: string): string | null {
  try {
    const raw = Buffer.from(encBase64url, "base64url");
    if (raw.length < IV_LEN + TAG_LEN + 1) return null;
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = raw.subarray(IV_LEN + TAG_LEN);
    const key = getKey32();
    const decipher = createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
