"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type TestLkShellTheme = "light" | "dark";

const STORAGE_KEY = "test-lk-mock-shell-theme";

type Ctx = {
  shellTheme: TestLkShellTheme;
  setShellTheme: (t: TestLkShellTheme) => void;
};

const TestLkMockShellThemeContext = createContext<Ctx | null>(null);

const THEME_STORE_EVENT = "test-lk-mock-shell-theme-store";

function readSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredShellTheme(): TestLkShellTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
    return readSystemDark() ? "dark" : "light";
  } catch {
    return readSystemDark() ? "dark" : "light";
  }
}

function subscribeShellTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  const onLocal = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_STORE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_STORE_EVENT, onLocal);
  };
}

export function TestLkMockShellThemeProvider({ children }: { children: ReactNode }) {
  const shellTheme = useSyncExternalStore(
    subscribeShellTheme,
    readStoredShellTheme,
    () => "light",
  );

  const setShellTheme = useCallback((t: TestLkShellTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(THEME_STORE_EVENT));
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
