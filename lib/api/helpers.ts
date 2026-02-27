/**
 * Общие хелперы для API-маршрутов: парсинг тела с лимитом размера,
 * единый формат ошибок, безопасный ответ 500 в production.
 */

import { NextRequest, NextResponse } from "next/server";

/** Максимальный размер тела запроса для auth/регистрации (512 KB) */
export const MAX_BODY_SIZE_AUTH = 512 * 1024;

/** Максимальный размер тела для остальных JSON POST (1 MB) */
export const MAX_BODY_SIZE_DEFAULT = 1024 * 1024;

/** Максимальный размер тела webhook (256 KB) */
export const MAX_BODY_SIZE_WEBHOOK = 256 * 1024;

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

/** Проверяет content-length и читает тело запроса с лимитом размера. */
async function readBodyWithLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const len = parseInt(contentLength, 10);
    if (Number.isNaN(len) || len > maxBytes) {
      return { ok: false, response: jsonError(413, "Тело запроса слишком большое") };
    }
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, "Не удалось прочитать тело запроса") };
  }
  if (raw.length > maxBytes) {
    return { ok: false, response: jsonError(413, "Тело запроса слишком большое") };
  }
  return { ok: true, text: raw };
}

/**
 * Парсит JSON из тела запроса с ограничением размера.
 * Возвращает либо { ok: true, data }, либо { ok: false, response } для немедленного return.
 */
export async function parseJsonWithLimit<T>(
  request: NextRequest,
  maxBytes: number = MAX_BODY_SIZE_DEFAULT,
): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: NextResponse }
> {
  const bodyResult = await readBodyWithLimit(request, maxBytes);
  if (!bodyResult.ok) return bodyResult;

  const raw = bodyResult.text;
  if (raw.trim() === "") {
    return { ok: false, response: jsonError(400, "Ожидается JSON в теле запроса") };
  }

  try {
    const data = JSON.parse(raw) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, response: jsonError(400, "Некорректный JSON") };
  }
}

/**
 * Читает тело запроса как текст с ограничением размера (защита от DoS).
 */
export async function readTextWithLimit(
  request: NextRequest,
  maxBytes: number = MAX_BODY_SIZE_DEFAULT,
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  return readBodyWithLimit(request, maxBytes);
}

/**
 * Единый формат JSON-ошибки: { error: string, details?: unknown }
 */
export function jsonError(
  status: number,
  message: string,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Парсит limit и offset из URLSearchParams с валидацией.
 */
export function parseLimitOffset(
  searchParams: URLSearchParams,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): { limit: number; offset: number } {
  const { defaultLimit = 20, maxLimit = 100 } = options;
  const limitRaw = searchParams.get("limit") ?? String(defaultLimit);
  const offsetRaw = searchParams.get("offset") ?? "0";
  const limit = Math.min(
    Math.max(1, parseInt(limitRaw, 10) || defaultLimit),
    maxLimit,
  );
  const offset = Math.max(0, parseInt(offsetRaw, 10) || 0);
  return { limit, offset };
}

/**
 * Ответ 500 без утечки внутренних деталей в production.
 * В development можно передать devMessage для логирования; в production возвращается только genericMessage.
 */
export function internalError(
  genericMessage: string = "Внутренняя ошибка сервера",
  devMessage?: string,
): NextResponse<ApiErrorBody> {
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd ? genericMessage : (devMessage ?? genericMessage);
  return NextResponse.json({ error: message }, { status: 500 });
}
