"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeChoice = "light" | "dark" | "system";

function useEffectiveTheme(choice: ThemeChoice): "light" | "dark" {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  if (choice === "system") return systemDark ? "dark" : "light";
  return choice;
}

type Ctx = {
  themeChoice: ThemeChoice;
  setThemeChoice: (t: ThemeChoice) => void;
  effective: "light" | "dark";
};

const TestLkThemeContext = createContext<Ctx | null>(null);

export function TestLkMockThemeProvider({ children }: { children: ReactNode }) {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>("system");
  const effective = useEffectiveTheme(themeChoice);
  const setThemeChoiceStable = useCallback((t: ThemeChoice) => setThemeChoice(t), []);
  const value = useMemo(
    () => ({ themeChoice, setThemeChoice: setThemeChoiceStable, effective }),
    [themeChoice, setThemeChoiceStable, effective],
  );
  return <TestLkThemeContext.Provider value={value}>{children}</TestLkThemeContext.Provider>;
}

export function useTestLkMockTheme(): Ctx {
  const c = useContext(TestLkThemeContext);
  if (!c) throw new Error("useTestLkMockTheme: нет провайдера");
  return c;
}
