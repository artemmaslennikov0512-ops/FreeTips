"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  applyDocumentShellChrome,
  readThemePreference,
  type SiteThemePreference,
} from "@/lib/document-shell-chrome";

type ThemeContextValue = {
  theme: SiteThemePreference;
  setTheme: (next: SiteThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<SiteThemePreference>("light");
  const [mounted, setMounted] = useState(false);

  const pathnameRef = useRef(pathname);
  const themeRef = useRef(theme);

  useEffect(() => {
    queueMicrotask(() => {
      setThemeState(readThemePreference());
      setMounted(true);
    });
  }, []);

  useLayoutEffect(() => {
    pathnameRef.current = pathname;
    themeRef.current = theme;
    if (!mounted) return;
    applyDocumentShellChrome(pathname, theme);
  }, [mounted, pathname, theme]);

  /*
   * Next иногда пересоздаёт meta theme-color после первого layout — двойной rAF подстраховывает Safari.
   */
  useEffect(() => {
    if (!mounted) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        applyDocumentShellChrome(pathname, theme);
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname, mounted, theme]);

  /*
   * Любое изменение <head> (в т.ч. поздние meta от Next) — снова нормализуем theme-color и data-theme.
   * Один раз на приложение; не нужно «точечно» ловить каждый маршрут.
   */
  useEffect(() => {
    if (!mounted || typeof MutationObserver === "undefined") return;
    let frame = 0;
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyDocumentShellChrome(pathnameRef.current, themeRef.current);
      });
    };
    const obs = new MutationObserver(schedule);
    obs.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["content", "media", "name"],
    });
    return () => {
      obs.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mounted]);

  const setTheme = useCallback((next: SiteThemePreference) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
