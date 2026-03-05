/**
 * Утилиты для отображения денежных сумм и дат.
 */

export function formatDate(iso: string, opts?: { includeYear?: boolean }): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    ...(opts?.includeYear && { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
