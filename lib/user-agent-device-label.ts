/**
 * Подпись устройства и браузера из User-Agent без тяжёлых зависимостей.
 */

const MAX_UA_LEN = 512;

export function truncateUserAgent(ua: string | null | undefined): string {
  if (!ua) return "";
  const t = ua.trim();
  return t.length <= MAX_UA_LEN ? t : t.slice(0, MAX_UA_LEN);
}

function deviceFormFactor(ua: string): "Планшет" | "Телефон" | "Компьютер" {
  const isMobile = /mobile|android.*mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  if (tablet) return "Планшет";
  if (isMobile) return "Телефон";
  return "Компьютер";
}

/** iOS / iPadOS major.minor из типичных UA */
function parseIosVersion(ua: string): string | null {
  const m =
    ua.match(/iPhone OS (\d+)[._](\d+)/i) ||
    ua.match(/CPU (?:iPhone )?OS (\d+)[._](\d+)/i) ||
    ua.match(/iPad.*OS (\d+)[._](\d+)/i);
  if (!m) return null;
  return m[2] === "0" ? m[1] : `${m[1]}.${m[2]}`;
}

function parsePlatformSuffix(ua: string): string {
  const android = ua.match(/Android\s+(\d+(?:\.\d+)?)/i);
  if (android) return `Android ${android[1]}`;

  const iosVer = parseIosVersion(ua);
  if (iosVer && /iphone|ipod|ipad|ios|like mac os x/i.test(ua)) return `iOS ${iosVer}`;

  if (/windows nt 10\.0/i.test(ua)) return "Windows 10/11";
  if (/windows nt 6\.3/i.test(ua)) return "Windows 8.1";
  if (/windows nt 6\.2/i.test(ua)) return "Windows 8";
  if (/windows nt 6\.1/i.test(ua)) return "Windows 7";
  if (/windows nt/i.test(ua)) return "Windows";

  const mac = ua.match(/Mac OS X (\d+)[._](\d+)(?:[._](\d+))?/i);
  if (mac) {
    const a = mac[1];
    const b = mac[2];
    return b === "0" && !mac[3] ? `macOS ${a}` : `macOS ${a}.${b}`;
  }
  if (/mac os x|macintosh/i.test(ua)) return "macOS";

  if (/android/i.test(ua)) return "Android";

  if (/linux/i.test(ua) && !/android/i.test(ua)) return "Linux";

  return "";
}

/**
 * Имя и мажорная версия браузера (Chromium / Firefox / Safari-цепочка).
 */
function parseBrowserFromUserAgent(ua: string): { name: string; version: string } | null {
  const edge = ua.match(/\bEdg(?:e|A|iOS)?\/(\d+)/i);
  if (edge) return { name: "Edge", version: edge[1] };

  const opr = ua.match(/\bOPR\/(\d+)/i);
  if (opr) return { name: "Opera", version: opr[1] };

  const samsung = ua.match(/\bSamsungBrowser\/(\d+)/i);
  if (samsung) return { name: "Samsung Internet", version: samsung[1] };

  const crios = ua.match(/\bCriOS\/(\d+)/i);
  if (crios) return { name: "Chrome", version: crios[1] };

  const chrome = ua.match(/\bChrome\/(\d+)/i);
  if (chrome && !/\bEdg/i.test(ua)) return { name: "Chrome", version: chrome[1] };

  const fxios = ua.match(/\bFxiOS\/(\d+)/i);
  if (fxios) return { name: "Firefox", version: fxios[1] };

  const firefox = ua.match(/\bFirefox\/(\d+)/i);
  if (firefox) return { name: "Firefox", version: firefox[1] };

  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|Opera/i.test(ua);
  if (isSafari) {
    const ver = ua.match(/\bVersion\/(\d+)/i);
    if (ver) return { name: "Safari", version: ver[1] };
    return { name: "Safari", version: "" };
  }

  return null;
}

type SessionDeviceDescription = {
  /** Тип устройства и ОС: «Телефон · Android 14» */
  platformLabel: string;
  /** Браузер с версией: «Chrome 131» */
  browserLabel: string | null;
};

/**
 * Для экрана «Сессии»: отдельно платформа и браузер.
 */
export function describeSessionDevice(userAgent: string): SessionDeviceDescription {
  const ua = userAgent.trim();
  if (!ua) {
    return { platformLabel: "Неизвестное устройство", browserLabel: null };
  }

  const form = deviceFormFactor(ua);
  const os = parsePlatformSuffix(ua);
  const platformLabel = os ? `${form} · ${os}` : form;

  const b = parseBrowserFromUserAgent(ua);
  let browserLabel: string | null = null;
  if (b) {
    browserLabel = b.version ? `${b.name} ${b.version}` : b.name;
  }

  if (/; wv\)/.test(ua) && browserLabel?.startsWith("Chrome")) {
    browserLabel = `${browserLabel} (встроенный браузер)`;
  }

  return { platformLabel, browserLabel };
}

/** Одна строка для простых случаев (логи и обратная совместимость). */
export function summarizeUserAgent(userAgent: string): string {
  const { platformLabel, browserLabel } = describeSessionDevice(userAgent);
  if (browserLabel) return `${platformLabel} · ${browserLabel}`;
  return platformLabel;
}
