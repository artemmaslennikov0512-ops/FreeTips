"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminShellTlkTheme = "light" | "dark";

const STORAGE_KEY = "admin-shell-tlk-theme";

type Ctx = {
  shellTheme: AdminShellTlkTheme;
  setShellTheme: (t: AdminShellTlkTheme) => void;
};

const AdminShellThemeContext = createContext<Ctx | null>(null);

function readSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function AdminShellThemeProvider({ children }: { children: ReactNode }) {
  const [shellTheme, setShellThemeState] = useState<AdminShellTlkTheme>("light");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "light" || raw === "dark") {
        setShellThemeState(raw);
      } else {
        setShellThemeState(readSystemDark() ? "dark" : "light");
      }
    } catch {
      setShellThemeState(readSystemDark() ? "dark" : "light");
    }
  }, []);

  const setShellTheme = useCallback((t: AdminShellTlkTheme) => {
    setShellThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ shellTheme, setShellTheme }), [shellTheme, setShellTheme]);

  return <AdminShellThemeContext.Provider value={value}>{children}</AdminShellThemeContext.Provider>;
}

export function useAdminShellTheme(): Ctx {
  const c = useContext(AdminShellThemeContext);
  if (!c) throw new Error("useAdminShellTheme: нет провайдера");
  return c;
}
