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
   * Next иногда пересоздаёт meta theme-color после первого layout — двойной rAF подстраховывает head (в т.ч. ЛК без theme-color).
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
   * Только meta theme-color / color-scheme в <head>: при любой вставке <link> и т.п. Next при навигации
   * иначе сотни мутаций → applyDocumentShellChrome в середине коммита React → «Cannot read properties of null (reading 'removeChild')».
   */
  useEffect(() => {
    if (!mounted || typeof MutationObserver === "undefined") return;
    let frame = 0;
    const touchesShellChromeMeta = (records: MutationRecord[]) => {
      for (const r of records) {
        if (r.type === "attributes" && r.target instanceof HTMLMetaElement) {
          const n = r.target.getAttribute("name");
          if (n === "theme-color" || n === "color-scheme") return true;
        }
        for (const n of r.addedNodes) {
          if (n instanceof HTMLMetaElement) {
            const name = n.getAttribute("name");
            if (name === "theme-color" || name === "color-scheme") return true;
          }
          if (n instanceof Element && typeof n.querySelector === "function") {
            if (n.querySelector('meta[name="theme-color"], meta[name="color-scheme"]')) return true;
          }
        }
        for (const n of r.removedNodes) {
          if (n instanceof HTMLMetaElement) {
            const name = n.getAttribute("name");
            if (name === "theme-color" || name === "color-scheme") return true;
          }
        }
      }
      return false;
    };
    const schedule = (records: MutationRecord[]) => {
      if (!touchesShellChromeMeta(records)) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyDocumentShellChrome(pathnameRef.current, themeRef.current);
      });
    };
    const obs = new MutationObserver((records) => schedule(records));
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
