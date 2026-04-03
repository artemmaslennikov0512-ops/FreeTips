/**
 * Краткая подпись устройства из User-Agent без тяжёлых зависимостей.
 */

const MAX_UA_LEN = 512;

export function truncateUserAgent(ua: string | null | undefined): string {
  if (!ua) return "";
  const t = ua.trim();
  return t.length <= MAX_UA_LEN ? t : t.slice(0, MAX_UA_LEN);
}

export function summarizeUserAgent(userAgent: string): string {
  const ua = userAgent.trim();
  if (!ua) return "Неизвестное устройство";

  const isMobile = /mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);

  let os = "";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios|crmo/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

  const device = tablet ? "Планшет" : isMobile ? "Телефон" : "Компьютер";
  const parts = [device];
  if (os) parts.push(os);
  if (browser) parts.push(browser);

  return parts.join(" · ");
}
