/**
 * Хром документа: `data-theme`, `app-shell-panel`, `meta theme-color`, `color-scheme`.
 * Публичный `applyDocumentShellChrome` откладывает правки `<head>` на два кадра — иначе при навигации Next/React
 * можно поймать `removeChild` на null. Синхронно только `applyDocumentShellChromeSync` (например после `popOverlaySafariChromeDark`).
 * Тёмные шторки: `pushOverlaySafariChromeDark` / `popOverlaySafariChromeDark`; на панели `theme-color` не ставим.
 * Простая мобильная шторка: `usePanelMobileSimpleDrawerEffects`. ЛК — фиксация body в `CabinetMobileNavPortals`.
 */

export const THEME_STORAGE_KEY = "theme";

/** Лендинг / сайт вне панели (дефолтный theme-color для светлой темы в boot / apply) */
export const THEME_COLOR_LIGHT_SITE = "#d4d8de";
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

function resolvedThemeColor(pathname: string | null, preference: SiteThemePreference): string | null {
  if (isPanelThemeScope(pathname)) return null;
  const effective = effectiveDocumentTheme(pathname, preference);
  if (effective === "dark") return THEME_COLOR_DARK;
  return THEME_COLOR_LIGHT_SITE;
}

function syncThemeColorMeta(content: string | null): void {
  /*
   * Safari / iOS: несколько theme-color с media=(prefers-color-scheme) от Next оставляют светлую панель
   * при системной светлой теме, даже если data-theme="dark" из localStorage. Удаляем все и вешаем одну мету без media.
   * `null` — убрать meta полностью (ЛК/админка/заведение/pay: без системной заливки theme-color).
   */
  const existing = document.querySelectorAll('meta[name="theme-color"]');
  if (content === null) {
    if (existing.length === 0) return;
    existing.forEach((meta) => meta.remove());
    return;
  }
  if (
    existing.length === 1 &&
    existing[0].getAttribute("content") === content &&
    !existing[0].hasAttribute("media")
  ) {
    return;
  }
  existing.forEach((meta) => meta.remove());
  const meta = document.createElement("meta");
  meta.setAttribute("data-ft-doc-chrome", "");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", content);
  document.head?.appendChild(meta);
}

function syncColorSchemeMeta(scheme: "light" | "dark"): void {
  const existing = document.querySelectorAll('meta[name="color-scheme"]');
  if (existing.length === 1 && existing[0].getAttribute("content") === scheme) {
    return;
  }
  existing.forEach((m) => m.remove());
  const m = document.createElement("meta");
  m.setAttribute("data-ft-doc-chrome", "");
  m.setAttribute("name", "color-scheme");
  m.setAttribute("content", scheme);
  document.head?.appendChild(m);
}

/** Счётчик открытых тёмных шторок: тёмный `color-scheme` для оверлея; `theme-color` на панели не ставим. */
let overlaySafariChromeDarkDepth = 0;

export function pushOverlaySafariChromeDark(): void {
  if (typeof document === "undefined") return;
  overlaySafariChromeDarkDepth += 1;
  if (overlaySafariChromeDarkDepth !== 1) return;
  syncThemeColorMeta(null);
  syncColorSchemeMeta("dark");
  document.documentElement.style.colorScheme = "dark";
}

export function popOverlaySafariChromeDark(): void {
  if (typeof document === "undefined") return;
  if (overlaySafariChromeDarkDepth <= 0) return;
  overlaySafariChromeDarkDepth -= 1;
  if (overlaySafariChromeDarkDepth > 0) return;
  applyDocumentShellChromeSync(
    typeof window !== "undefined" ? window.location.pathname : null,
    readThemePreference(),
  );
}

let deferredOuterRaf = 0;
let deferredInnerRaf = 0;
let deferredFlushPending = false;
let deferredPathname: string | null = null;
let deferredPreference: SiteThemePreference = "light";

function cancelDeferredDocumentShellChrome(): void {
  if (deferredOuterRaf) {
    cancelAnimationFrame(deferredOuterRaf);
    deferredOuterRaf = 0;
  }
  if (deferredInnerRaf) {
    cancelAnimationFrame(deferredInnerRaf);
    deferredInnerRaf = 0;
  }
  deferredFlushPending = false;
}

function scheduleDeferredDocumentShellChrome(): void {
  if (deferredFlushPending) return;
  deferredFlushPending = true;
  deferredOuterRaf = requestAnimationFrame(() => {
    deferredOuterRaf = 0;
    deferredInnerRaf = requestAnimationFrame(() => {
      deferredInnerRaf = 0;
      deferredFlushPending = false;
      applyDocumentShellChromeNow(deferredPathname, deferredPreference);
    });
  });
}

function applyDocumentShellChromeNow(pathname: string | null, preference: SiteThemePreference): void {
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
  const metaContent = forceDarkChrome
    ? isPanelThemeScope(pathname)
      ? null
      : THEME_COLOR_DARK
    : resolvedThemeColor(pathname, preference);
  syncThemeColorMeta(metaContent);
  syncColorSchemeMeta(forceDarkChrome || effective === "dark" ? "dark" : "light");

  if (forceDarkChrome) {
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.style.colorScheme = effective === "dark" ? "dark" : "light";
  }
  document.documentElement.style.removeProperty("background-color");
}

/** Сразу (после закрытия оверлея и т.п.). Отменяет отложенный вызов, если он висел в очереди. */
function applyDocumentShellChromeSync(pathname: string | null, preference: SiteThemePreference): void {
  if (typeof document === "undefined") return;
  cancelDeferredDocumentShellChrome();
  applyDocumentShellChromeNow(pathname, preference);
}

/**
 * Отложенное применение: не трогать `<head>` в том же такте, что коммит React / смена маршрута.
 * Вызывать из ThemeProvider и при необходимости из шторок ЛК.
 */
export function applyDocumentShellChrome(pathname: string | null, preference: SiteThemePreference): void {
  if (typeof document === "undefined") return;
  deferredPathname = pathname;
  deferredPreference = preference;
  scheduleDeferredDocumentShellChrome();
}
