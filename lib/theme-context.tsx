"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "theme";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Тема из localStorage применяется в ЛК, админке, странице чаевых (/pay) и Вход/Регистрация/Заявка; на лендинге всегда светлая. */
function isThemeScope(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/cabinet") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/pay") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/zayavka") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/change-password")
  );
}

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setThemeState(readTheme());
      setMounted(true);
    });
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    const applyHere = isThemeScope(pathname);
    const effective = applyHere ? theme : "light";
    document.documentElement.setAttribute("data-theme", effective);
    if (applyHere) window.localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme, pathname]);

  const setTheme = useCallback((next: Theme) => {
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
