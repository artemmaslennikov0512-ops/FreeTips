"use client";

import { Menu } from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";

const MENU_BTN = `cabinet-menu-btn ${CABINET_WAITER_BTN} flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center !gap-0 !p-0 active:scale-95 transition-[transform,opacity]`;

type PanelShellMobileCornerProps = {
  ariaControls: string;
  /** Для aria-haspopup: сайдбар заведения — не dialog */
  ariaHaspopup?: "dialog" | "true";
  menuButtonClassName?: string;
};

/**
 * Компактный угол (тема + меню) на мобильном для панелей с PanelMobileMenuProvider.
 * Заменяет узкую полоску в Header без потери доступа к теме и навигации.
 */
export function PanelShellMobileCorner({
  ariaControls,
  ariaHaspopup = "dialog",
  menuButtonClassName = "",
}: PanelShellMobileCornerProps) {
  const { menuButtonRef, sidebarOpen, setSidebarOpen } = usePanelMobileMenu();

  return (
    <div
      className="fixed z-[2005] flex items-center gap-1.5 lg:hidden"
      style={{
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
        top: "max(0.5rem, calc(env(safe-area-inset-top, 0px) + 0.25rem))",
      }}
    >
      <ThemeToggle variant="default" />
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setSidebarOpen((o) => !o)}
        className={`${MENU_BTN} ${menuButtonClassName}`.trim()}
        aria-label="Меню"
        aria-expanded={sidebarOpen}
        aria-haspopup={ariaHaspopup}
        aria-controls={ariaControls}
      >
        <Menu className="h-5 w-5 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
