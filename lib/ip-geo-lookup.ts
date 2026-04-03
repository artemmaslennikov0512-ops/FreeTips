/**
 * Определение страны/города по публичному IP (внешний сервис, короткий таймаут).
 * Не вызывать для приватных/локальных адресов.
 */

function isProbablyPrivateOrLocalIp(ip: string): boolean {
  const s = ip.trim().toLowerCase();
  if (!s || s === "unknown" || s === "::1") return true;
  if (s.startsWith("127.")) return true;
  if (s.startsWith("10.")) return true;
  if (s.startsWith("192.168.")) return true;
  const m = /^172\.(\d+)\./.exec(s);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  if (s.startsWith("fe80:") || s.startsWith("fc") || s.startsWith("fd")) return true;
  return false;
}

export type IpGeoResult = { country: string; city: string };

/**
 * HTTPS ipwho.is — без ключа; при ошибке/таймауте возвращает null.
 */
export async function lookupIpGeoQuick(
  ip: string,
  maxWaitMs: number = 1200,
): Promise<IpGeoResult | null> {
  if (isProbablyPrivateOrLocalIp(ip)) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(300, maxWaitMs));
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      city?: string;
    };
    if (!data.success) return null;
    const country = typeof data.country === "string" ? data.country.trim() : "";
    const city = typeof data.city === "string" ? data.city.trim() : "";
    if (!country && !city) return null;
    return { country: country || "—", city: city || "—" };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
