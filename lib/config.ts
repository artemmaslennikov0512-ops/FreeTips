/**
 * Централизованный конфиг из env с валидацией (Zod).
 * Критичные переменные проверяются при первом обращении.
 */

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  /** Опционально: 64 hex = 32 байта для AES-256 шифрования секретов TOTP админки; иначе ключ выводится из JWT_SECRET */
  TOTP_ENCRYPTION_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  REDIS_URL: z.string().url().optional().or(z.literal("")),
  PAYGINE_BASE_URL: z.string().optional(),
  PAYGINE_SECTOR: z.string().optional(),
  PAYGINE_PASSWORD: z.string().optional(),
  PAYGINE_SD_REF: z.string().optional(),
  PAYGINE_SD_REF_LEGAL: z.string().optional(),
  PAYGINE_REQUEST_TIMEOUT_MS: z.string().optional(),
  PAYGINE_RELOCATE_DELAY_MS: z.string().optional(),
  PAYGINE_RELOCATE_RETRY_MS: z.string().optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

let parsed: EnvSchema | null = null;

function getEnv(): EnvSchema {
  if (parsed) return parsed;
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    REDIS_URL: process.env.REDIS_URL,
    PAYGINE_BASE_URL: process.env.PAYGINE_BASE_URL,
    PAYGINE_SECTOR: process.env.PAYGINE_SECTOR,
    PAYGINE_PASSWORD: process.env.PAYGINE_PASSWORD,
    PAYGINE_SD_REF: process.env.PAYGINE_SD_REF,
    PAYGINE_SD_REF_LEGAL: process.env.PAYGINE_SD_REF_LEGAL,
    PAYGINE_REQUEST_TIMEOUT_MS: process.env.PAYGINE_REQUEST_TIMEOUT_MS,
    PAYGINE_RELOCATE_DELAY_MS: process.env.PAYGINE_RELOCATE_DELAY_MS,
    PAYGINE_RELOCATE_RETRY_MS: process.env.PAYGINE_RELOCATE_RETRY_MS,
  });
  if (!result.success) {
    throw new Error(`Invalid env: ${JSON.stringify(result.error.flatten())}`);
  }
  parsed = result.data;
  return parsed;
}

/** NODE_ENV (development | production | test). */
export function getNodeEnv(): "development" | "production" | "test" {
  return getEnv().NODE_ENV;
}

/** JWT_SECRET. Бросает, если не задан (при генерации/проверке токенов). */
export function getJwtSecret(): string {
  const s = getEnv().JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET должен быть установлен в .env");
  return s;
}

/** JWT_REFRESH_SECRET. */
export function getJwtRefreshSecret(): string {
  const s = getEnv().JWT_REFRESH_SECRET;
  if (!s) throw new Error("JWT_REFRESH_SECRET должен быть установлен в .env");
  return s;
}

/** NEXT_PUBLIC_APP_URL (без слэша в конце) или пустая строка. */
export function getAppUrl(): string {
  const u = getEnv().NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return u ?? "";
}

/** REDIS_URL или пустая строка. */
export function getRedisUrl(): string {
  return getEnv().REDIS_URL?.trim() ?? "";
}

/** Paygine: sector и password (null если не настроен). Пароль trim + BOM — иначе лишний символ даёт «Invalid signature» от ПЦ. */
export function getPaygineConfig(): { sector: string; password: string } | null {
  const env = getEnv();
  const sector = env.PAYGINE_SECTOR?.trim();
  const passwordRaw = env.PAYGINE_PASSWORD;
  const password =
    typeof passwordRaw === "string" ? passwordRaw.trim().replace(/^\uFEFF/, "") : "";
  if (!sector || !password) return null;
  return { sector, password };
}

/** Paygine SD_REF_LEGAL (кубышка ЮЛ для комиссий). */
export function getPaygineSdRefLegal(): string {
  return getEnv().PAYGINE_SD_REF_LEGAL?.trim() ?? "";
}

/** Задержка перед Relocate после оплаты (ms). */
export function getPaygineRelocateDelayMs(): number {
  const v = getEnv().PAYGINE_RELOCATE_DELAY_MS;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 10_000;
}

/** Интервал повтора Relocate (ms). */
export function getPaygineRelocateRetryMs(): number {
  const v = getEnv().PAYGINE_RELOCATE_RETRY_MS;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}

/**
 * Лимит POST на URL вебхука Paygine с одного IP (окно 1 мин).
 * @see lib/middleware/rate-limit.ts
 */
export function getWebhookRateLimitPerMinute(): number {
  const raw = process.env.WEBHOOK_RATE_LIMIT_MAX?.trim();
  if (!raw) return 600;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 30 ? Math.min(n, 20_000) : 600;
}

/**
 * Сколько переливов Paygine может выполняться параллельно (очередь после вебхука).
 * С REDIS_URL — глобально между инстансами (ключ Redis).
 */
export function getPaygineRelocateQueueConcurrency(): number {
  const raw = process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY?.trim();
  if (!raw) return 4;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 32 ? n : 4;
}

/** Сброс кэша (для тестов). */
export function resetConfigCache(): void {
  parsed = null;
}
