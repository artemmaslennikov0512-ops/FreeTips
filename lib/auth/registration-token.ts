import crypto from "crypto";

const REGISTRATION_TOKEN_BYTES = 24;

/** Ссылка из одобренной заявки клиента — действительна 24 часа */
export const REGISTRATION_TOKEN_TTL_FROM_REQUEST_MS = 24 * 60 * 60 * 1000;

/** Токен, созданный суперадмином по кнопке «Получить токен» — действителен 1 час */
export const REGISTRATION_TOKEN_TTL_MANUAL_MS = 60 * 60 * 1000;

export function generateRegistrationToken(): string {
  return crypto.randomBytes(REGISTRATION_TOKEN_BYTES).toString("base64url");
}

export function hashRegistrationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
