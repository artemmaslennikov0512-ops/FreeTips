/**
 * Утилиты для отображения денежных сумм и дат.
 */

const MOSCOW_TZ = "Europe/Moscow";

/** Календарная дата (YYYY-MM-DD) по московскому времени — для группировки операций и т.п. */
export function toMoscowDateKey(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(iso).trim());
    return m ? m[1]! : "";
  }
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(t));
}

/** Подпись дня для заголовков: «24 апреля 2026 г.» по календарю МСК (ymd — из toMoscowDateKey). */
export function formatMoscowCalendarDayLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatDate(iso: string, opts?: { includeYear?: boolean }): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: MOSCOW_TZ,
    day: "2-digit",
    month: "2-digit",
    ...(opts?.includeYear && { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Человекочитаемое «N мин назад» для lastSeenAt в админке. */
export function formatRelativeTimeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 45) return "только что";
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  const min = Math.floor(diffSec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const hours = Math.floor(min / 60);
  if (hours < 36) return rtf.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  const months = Math.floor(days / 30);
  if (months < 24) return rtf.format(-months, "month");
  return rtf.format(-Math.floor(days / 365), "year");
}

/**
 * Значение для input[type=date] (только yyyy-mm-dd). API может отдать ISO с временем или иной формат строки.
 */
export function toDateInputValueFromApi(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const dmy = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (dmy) {
    const [, dd, mm, yyyy] = dmy;
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const head = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1]!;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Вариант 1: пробел — разделитель тысяч, точка — копейки. Пример: 10 000.00 ₽ */
function formatRubWithSpaces(rub: number, withDecimals: boolean): string {
  const sign = rub < 0 ? "-" : "";
  const abs = Math.abs(rub);
  const fixed = abs.toFixed(withDecimals ? 2 : 0);
  const [intPart, decPart] = fixed.split(".");
  const intWithSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return withDecimals ? `${sign}${intWithSpaces}.${decPart} ₽` : `${sign}${intWithSpaces} ₽`;
}

export function formatMoney(kopecks: bigint | number): string {
  const kop = typeof kopecks === "number" ? BigInt(kopecks) : kopecks;
  const rub = Number(kop) / 100;
  return formatRubWithSpaces(rub, true);
}

/** Форматирует копейки в рубли без дробной части (для целых сумм). */
export function formatMoneyCompact(kopecks: bigint | number): string {
  const kop = typeof kopecks === "number" ? BigInt(kopecks) : kopecks;
  const rub = Math.trunc(Number(kop) / 100);
  return formatRubWithSpaces(rub, false);
}
