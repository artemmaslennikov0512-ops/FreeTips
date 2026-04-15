/**
 * Хром документа: `data-theme`, `app-shell-panel`, `meta theme-color`, `color-scheme`.
 * Нормализация здесь + в ThemeProvider (rAF, MutationObserver на head) — иначе Safari/iOS даёт швы и чужой `theme-color`.
 * Тёмные шторки: `useMobileDarkChromeOverlay` → счётчик `pushOverlaySafariChromeDark` / `popOverlaySafariChromeDark`.
 * Простая мобильная шторка (overflow + Escape + overlay): `usePanelMobileSimpleDrawerEffects`. ЛК — фиксация body в `CabinetMobileNavPortals`.
 */

export const THEME_STORAGE_KEY = "theme";

/** Лендинг / сайт вне панели (совпадает с app/layout viewport themeColor light) */
export const THEME_COLOR_LIGHT_SITE = "#d4d8de";
/** ЛК, админка, заведение, /pay — светлая тема сайта */
export const THEME_COLOR_LIGHT_PANEL = "#e0dfdc";
/** Тёмная тема сайта и панели (совпадает с html.app-shell-panel[data-theme=dark]) */
export const THEME_COLOR_DARK = "#0d0e12";

export type SiteThemePreference = "light" | "dark";

function isAuthOnlyPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/zayavka") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/change-password") ||
    pathname.startsWith("/reset-password")
  );
}

/** Где действует переключатель темы из localStorage */
function isPanelThemeScope(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/cabinet") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/establishment") ||
    pathname.startsWith("/pay")
  );
}

export function readThemePreference(): SiteThemePreference {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

/** Значение `data-theme` на <html> с учётом маршрута */
function effectiveDocumentTheme(pathname: string | null, preference: SiteThemePreference): SiteThemePreference {
  if (isAuthOnlyPath(pathname)) return "dark";
  if (isPanelThemeScope(pathname)) return preference;
  return "light";
}

function resolvedThemeColor(pathname: string | null, preference: SiteThemePreference): string {
  const effective = effectiveDocumentTheme(pathname, preference);
  if (effective === "dark") return THEME_COLOR_DARK;
  if (isPanelThemeScope(pathname)) return THEME_COLOR_LIGHT_PANEL;
  return THEME_COLOR_LIGHT_SITE;
}

function syncThemeColorMeta(content: string): void {
  /*
   * Safari / iOS: несколько theme-color с media=(prefers-color-scheme) от Next оставляют светлую панель
   * при системной светлой теме, даже если data-theme="dark" из localStorage. Удаляем все и вешаем одну мету без media.
   */
  const existing = document.querySelectorAll('meta[name="theme-color"]');
  if (
    existing.length === 1 &&
    existing[0].getAttribute("content") === content &&
    !existing[0].hasAttribute("media")
  ) {
    return;
  }
  existing.forEach((meta) => meta.remove());
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", content);
  document.head.appendChild(meta);
}

function syncColorSchemeMeta(scheme: "light" | "dark"): void {
  const existing = document.querySelectorAll('meta[name="color-scheme"]');
  if (existing.length === 1 && existing[0].getAttribute("content") === scheme) {
    return;
  }
  existing.forEach((m) => m.remove());
  const m = document.createElement("meta");
  m.setAttribute("name", "color-scheme");
  m.setAttribute("content", scheme);
  document.head.appendChild(m);
}

/** Счётчик открытых тёмных шторок: Safari тянет `theme-color` из сохранённой светлой темы — без override полосы у краёв. */
let overlaySafariChromeDarkDepth = 0;

export function pushOverlaySafariChromeDark(): void {
  if (typeof document === "undefined") return;
  overlaySafariChromeDarkDepth += 1;
  if (overlaySafariChromeDarkDepth !== 1) return;
  syncThemeColorMeta(THEME_COLOR_DARK);
  syncColorSchemeMeta("dark");
  document.documentElement.style.colorScheme = "dark";
}

export function popOverlaySafariChromeDark(): void {
  if (typeof document === "undefined") return;
  if (overlaySafariChromeDarkDepth <= 0) return;
  overlaySafariChromeDarkDepth -= 1;
  if (overlaySafariChromeDarkDepth > 0) return;
  applyDocumentShellChrome(typeof window !== "undefined" ? window.location.pathname : null, readThemePreference());
}

/**
 * Применить тему к документу. Вызывать из ThemeProvider (layout + rAF + MutationObserver),
 * не дублировать руками в страницах.
 */
export function applyDocumentShellChrome(pathname: string | null, preference: SiteThemePreference): void {
  if (typeof document === "undefined") return;

  const authOnly = isAuthOnlyPath(pathname);
  const applyHere = isPanelThemeScope(pathname);
  const effective = effectiveDocumentTheme(pathname, preference);

  document.documentElement.setAttribute("data-theme", effective);
  document.documentElement.classList.toggle("app-shell-panel", applyHere);

  if (applyHere && !authOnly) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
  }

  const forceDarkChrome = overlaySafariChromeDarkDepth > 0;
  const metaContent = forceDarkChrome ? THEME_COLOR_DARK : resolvedThemeColor(pathname, preference);
  syncThemeColorMeta(metaContent);
  syncColorSchemeMeta(forceDarkChrome || effective === "dark" ? "dark" : "light");

  if (forceDarkChrome) {
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.style.colorScheme = effective === "dark" ? "dark" : "light";
  }
  document.documentElement.style.removeProperty("background-color");
}
