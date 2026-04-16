"use client";

import { useCallback } from "react";
import { useTheme } from "@/lib/theme-context";
import type { SiteThemePreference } from "@/lib/document-shell-chrome";

type PanelSidebarThemeSwitchProps = {
  /** M5 ЛК: холодные акценты вместо золота */
  variant?: "default" | "m5";
  className?: string;
};

/**
 * Выбор темы в сайдбаре: две опции с «вдавленным» активным состоянием (inset-shadow + translate).
 */
export function PanelSidebarThemeSwitch({ variant = "default", className = "" }: PanelSidebarThemeSwitchProps) {
  const { theme, setTheme } = useTheme();

  const onPick = useCallback(
    (next: SiteThemePreference) => {
      setTheme(next);
    },
    [setTheme],
  );

  const isM5 = variant === "m5";

  const labelClass = isM5
    ? "mb-1.5 px-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/45"
    : "mb-1.5 px-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--color-text)]/45";

  const rowClass = "flex gap-2";

  const baseBtn =
    "flex-1 rounded-lg px-2 py-2.5 text-center text-sm font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-1";

  const inactive = isM5
    ? `${baseBtn} border border-white/12 bg-white/[0.06] text-white/75 shadow-[0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/10 active:translate-y-px active:shadow-inner`
    : `${baseBtn} border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 text-[var(--color-text)]/80 shadow-[0_1px_2px_rgba(10,25,47,0.06)] hover:bg-[var(--color-dark-gray)]/12 active:translate-y-px active:shadow-inner`;

  const activeLight = isM5
    ? `${baseBtn} border border-[#4a9fff]/55 bg-[#1c69d4]/20 text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)] translate-y-px`
    : `${baseBtn} border border-[var(--color-brand-gold)]/5 bg-white text-[#0a192f] shadow-[inset_0_2px_6px_rgba(10,25,47,0.14)] translate-y-px`;

  const activeDark = isM5
    ? `${baseBtn} border border-[#e5252a]/45 bg-black/35 text-[#fecaca] shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] translate-y-px`
    : `${baseBtn} border border-white/10 bg-[#1a1d24] text-[#f4f4f5] shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)] translate-y-px`;

  return (
    <div className={`panel-sidebar-theme-switch shrink-0 ${className}`.trim()} role="group" aria-label="Тема оформления">
      <div className={labelClass}>Тема</div>
      <div className={rowClass}>
        <button
          type="button"
          aria-pressed={theme === "light"}
          onClick={() => onPick("light")}
          className={theme === "light" ? activeLight : inactive}
        >
          Светлая
        </button>
        <button
          type="button"
          aria-pressed={theme === "dark"}
          onClick={() => onPick("dark")}
          className={theme === "dark" ? activeDark : inactive}
        >
          Тёмная
        </button>
      </div>
    </div>
  );
}
