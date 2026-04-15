"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    queueMicrotask(() => {
      setThemeState(readThemePreference());
      setMounted(true);
    });
  }, []);

  /*
   * Один вызов: `applyDocumentShellChrome` сам откладывает правки `<head>` (см. document-shell-chrome).
   * MutationObserver на head убран — он провоцировал гонки с React при навигации (`removeChild` на null).
   */
  useEffect(() => {
    if (!mounted) return;
    applyDocumentShellChrome(pathname, theme);
  }, [mounted, pathname, theme]);

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
