"use client";

import { useTheme } from "@/lib/theme-context";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--color-bg-sides)] text-[var(--color-text)] transition-all duration-200 hover:border-[var(--color-brand-gold)]/60 hover:bg-[var(--color-brand-gold)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] [&_svg]:transition-colors [&_svg]:duration-200"
      aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
      title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
    >
      {theme === "dark" ? (
        <Sun className="theme-toggle-icon h-4 w-4 text-[var(--color-brand-gold)]" aria-hidden strokeWidth={2.25} />
      ) : (
        <Moon className="theme-toggle-icon h-4 w-4" aria-hidden strokeWidth={2} />
      )}
    </button>
  );
}
