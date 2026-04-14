/**
 * Дата/время брони в календаре Москвы (Europe/Moscow, UTC+3).
 */

/** YYYY-MM-DD — границы календарного дня по Москве (для списка броней). */
export function moscowDayBoundsFromYmd(ymd: string): { start: Date; endExclusive: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const start = new Date(`${ymd}T00:00:00+03:00`);
  if (Number.isNaN(start.getTime())) return null;
  const endExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, endExclusive };
}

/** Сегодняшняя дата YYYY-MM-DD по Москве. */
export function todayYmdMoscow(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Собрать момент из календарной даты и времени (часы:минуты) по Москве. */
export function combineMoscowDateAndTime(dateYmd: string, timeHm: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeHm)) return null;
  const d = new Date(`${dateYmd}T${timeHm}:00+03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Если конец ≤ начала (например 23:00–01:00 в один календарный день ввода), сдвигаем конец на сутки. */
export function normalizeEndsAfterStart(startsAt: Date, endsAt: Date): Date {
  if (endsAt > startsAt) return endsAt;
  return new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
}

export function moscowYmdFromUtcDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function moscowHmFromUtcDate(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}
