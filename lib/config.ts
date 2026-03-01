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
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal("")),
  REDIS_URL: z.string().url().optional().or(z.literal("")),
  PAYGINE_BASE_URL: z.string().optional(),
  PAYGINE_SECTOR: z.string().optional(),
  PAYGINE_PASSWORD: z.string().optional(),
  PAYGINE_SD_REF: z.string().optional(),
  PAYGINE_SD_REF_LEGAL: z.string().optional(),
  PAYGINE_REQUEST_TIMEOUT_MS: z.string().optional(),
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
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    REDIS_URL: process.env.REDIS_URL,
    PAYGINE_BASE_URL: process.env.PAYGINE_BASE_URL,
    PAYGINE_SECTOR: process.env.PAYGINE_SECTOR,
    PAYGINE_PASSWORD: process.env.PAYGINE_PASSWORD,
    PAYGINE_SD_REF: process.env.PAYGINE_SD_REF,
    PAYGINE_SD_REF_LEGAL: process.env.PAYGINE_SD_REF_LEGAL,
    PAYGINE_REQUEST_TIMEOUT_MS: process.env.PAYGINE_REQUEST_TIMEOUT_MS,
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

/** DATABASE_URL. Бросает, если не задан (при обращении к БД). */
export function getDatabaseUrl(): string {
  const url = getEnv().DATABASE_URL;
  if (!url?.trim()) throw new Error("DATABASE_URL должен быть установлен в .env");
  return url;
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

/** Paygine: sector и password (null если не настроен). */
export function getPaygineConfig(): { sector: string; password: string } | null {
  const env = getEnv();
  const sector = env.PAYGINE_SECTOR?.trim();
  const password = env.PAYGINE_PASSWORD;
  if (!sector || !password) return null;
  return { sector, password };
}

/** Paygine base URL (без слэша). */
export function getPaygineBaseUrl(): string {
  return getEnv().PAYGINE_BASE_URL?.trim().replace(/\/$/, "") ?? "";
}

/** Paygine request timeout (ms). */
export function getPaygineRequestTimeoutMs(): number {
  const v = getEnv().PAYGINE_REQUEST_TIMEOUT_MS;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 30_000;
}

/** Сброс кэша (для тестов). */
export function resetConfigCache(): void {
  parsed = null;
}
