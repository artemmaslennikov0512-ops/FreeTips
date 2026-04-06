/**
 * Флаги для скриптов вывода: --sd-ref=..., --pan=... (остальное — позиционные аргументы).
 * PAN в логи не пишем целиком — только маска.
 */
export function extractPayoutCliFlags(argv: string[]): {
  rest: string[];
  sdRef?: string;
  pan?: string;
} {
  const rest: string[] = [];
  let sdRef: string | undefined;
  let pan: string | undefined;
  for (const a of argv) {
    if (a.startsWith("--sd-ref=")) {
      const v = a.slice(9).trim();
      if (v) sdRef = v;
    } else if (a.startsWith("--pan=")) {
      const v = a.slice(6).replace(/\s/g, "").trim();
      if (v) pan = v;
    } else {
      rest.push(a);
    }
  }
  return { rest, sdRef, pan };
}

export function maskPanLast4(pan: string): string {
  const d = pan.replace(/\s/g, "");
  if (d.length < 4) return "****";
  return `****${d.slice(-4)}`;
}
