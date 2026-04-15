/**
 * Единая точка для «хрома» документа: data-theme, класс панели, meta theme-color, color-scheme.
 *
 * Почему без этого «подхватываются» чужие цвета на iOS / Safari:
 * - Next из `viewport.themeColor` может вставить несколько `<meta name="theme-color" media="…">`;
 *   при SPA навигации они иногда пересоздаются уже с media — Safari рисует полосы адреса не тем цветом.
 * - `body` с Tailwind `bg-[var(--color-bg)]` берёт `--color-bg` из каскада; пока на `html` не выставлены
 *   `data-theme` / `--color-bg` для панели, один кадр может быть старый цвет (оверскролл / safe area).
 * - Любой поздний патч `<head>` обходит локальные «точечные» фиксы — поэтому нормализация здесь + Observer.
 * - В светлой теме Safari красит полосы у краёв по `theme-color` (часто `#e0dfdc`); тёмная шторка поверх не меняет
 *   этот meta — без `pushOverlaySafariChromeDark` при открытой шторке остаются «сохранённые» светлые полосы.
 *   Для любого нового полноэкранного тёмного оверлея на мобильном: `useMobileDarkChromeOverlay` в `lib/use-mobile-dark-chrome-overlay.ts`.
 */

export const THEME_STORAGE_KEY = "theme";

/** Лендинг / сайт вне панели (совпадает с app/layout viewport themeColor light) */
export const THEME_COLOR_LIGHT_SITE = "#d4d8de";
/** ЛК, админка, заведение, /pay — светлая тема сайта */
export const THEME_COLOR_LIGHT_PANEL = "#e0dfdc";
/** Тёмная тема сайта и панели (совпадает с html.app-shell-panel[data-theme=dark]) */
export const THEME_COLOR_DARK = "#0d0e12";

export type SiteThemePreference = "light" | "dark";

export function isAuthOnlyPath(pathname: string | null): boolean {
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
export function isPanelThemeScope(pathname: string | null): boolean {
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
export function effectiveDocumentTheme(pathname: string | null, preference: SiteThemePreference): SiteThemePreference {
  if (isAuthOnlyPath(pathname)) return "dark";
  if (isPanelThemeScope(pathname)) return preference;
  return "light";
}

function themeColorFor(pathname: string | null, preference: SiteThemePreference): string {
  const authOnly = isAuthOnlyPath(pathname);
  const applyHere = isPanelThemeScope(pathname);
  const effective = authOnly ? "dark" : applyHere ? preference : "light";
  if (effective === "dark") return THEME_COLOR_DARK;
  if (applyHere) return THEME_COLOR_LIGHT_PANEL;
  return THEME_COLOR_LIGHT_SITE;
}

/**
 * Счётчик открытых полноэкранных шторок с тёмным затемнением при **светлой** сохранённой теме сайта.
 * Safari окрашивает область статус-бара и панели по `theme-color`; если оставить `#e0dfdc`, а меню тёмное —
 * сверху/снизу остаются «сохранённые» светлые полосы (это не CSS страницы, а хром браузера).
 */
let overlaySafariChromeDarkDepth = 0;

/** Пока шторка открыта — `theme-color` и `color-scheme` под тёмное затемнение (вложенность через счётчик). */
export function pushOverlaySafariChromeDark(): void {
  if (typeof document === "undefined") return;
  overlaySafariChromeDarkDepth += 1;
  if (overlaySafariChromeDarkDepth !== 1) return;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute("media");
    meta.setAttribute("content", THEME_COLOR_DARK);
  });
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

  const color = themeColorFor(pathname, preference);
  const forceDarkChrome = overlaySafariChromeDarkDepth > 0;
  const metaContent = forceDarkChrome ? THEME_COLOR_DARK : color;
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute("media");
    meta.setAttribute("content", metaContent);
  });

  if (forceDarkChrome) {
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.style.colorScheme = effective === "dark" ? "dark" : "light";
  }
  document.documentElement.style.removeProperty("background-color");
}
