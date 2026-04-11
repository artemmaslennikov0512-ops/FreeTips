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

export type TestLkShellTheme = "light" | "dark";

const STORAGE_KEY = "test-lk-mock-shell-theme";

type Ctx = {
  shellTheme: TestLkShellTheme;
  setShellTheme: (t: TestLkShellTheme) => void;
};

const TestLkMockShellThemeContext = createContext<Ctx | null>(null);

function readSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function TestLkMockShellThemeProvider({ children }: { children: ReactNode }) {
  const [shellTheme, setShellThemeState] = useState<TestLkShellTheme>("light");

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

  const setShellTheme = useCallback((t: TestLkShellTheme) => {
    setShellThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ shellTheme, setShellTheme }), [shellTheme, setShellTheme]);

  return <TestLkMockShellThemeContext.Provider value={value}>{children}</TestLkMockShellThemeContext.Provider>;
}

export function useTestLkMockShellTheme(): Ctx {
  const c = useContext(TestLkMockShellThemeContext);
  if (!c) throw new Error("useTestLkMockShellTheme: нет провайдера");
  return c;
}
