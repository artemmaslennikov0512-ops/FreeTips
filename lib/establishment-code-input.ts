/**
 * Ввод кода заведения (uniqueSlug пула): тот же формат, что глобальный код официанта NNN-NNN.
 */

import { parseGlobalWaiterCodeString } from "@/lib/waiter-qr-identifier";

export const MSG_EST_CODE_EMPTY = "Введите код заведения";

export const MSG_EST_CODE_FORMAT =
  "Неверный формат кода заведения. Укажите 6 цифр: 000-002 или без дефиса 000002. Это код заведения от администратора, а не персональная ссылка официанта.";

export const MSG_EST_CODE_NOT_FOUND =
  "Заведение не найдено. Проверьте правильность набранного кода заведения. Если ошибка повторяется, уточните код у администратора.";

/** Заведение по ID не найдено (устаревший результат поиска и т.п.). */
export const MSG_ESTABLISHMENT_STALE_OR_MISSING =
  "Заведение не найдено. Выполните поиск по коду заново и проверьте правильность ввода.";

export function normalizeEstablishmentCodeInput(raw: string): string {
  const trimmed = raw.trim();
  const dashes = trimmed.replace(/[\u2013\u2014\u2212]/g, "-");
  const compact = dashes.replace(/\s/g, "");
  if (/^\d{6}$/.test(compact)) {
    return `${compact.slice(0, 3)}-${compact.slice(3)}`;
  }
  return compact;
}

export function validateEstablishmentCodeFormat(
  normalized: string,
): { ok: true; code: string } | { ok: false; message: string } {
  if (!normalized) {
    return { ok: false, message: MSG_EST_CODE_EMPTY };
  }
  const serial = parseGlobalWaiterCodeString(normalized);
  if (serial === null) {
    return { ok: false, message: MSG_EST_CODE_FORMAT };
  }
  return { ok: true, code: normalized };
}
