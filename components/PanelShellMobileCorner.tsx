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

/** Фиксированная зона: тема + меню, под ними золотая полоса на всю ширину (кабинет заведения). */
export function PanelShellMobileCorner({
  ariaControls,
  ariaHaspopup = "dialog",
  menuButtonClassName = "",
}: PanelShellMobileCornerProps) {
  const { menuButtonRef, sidebarOpen, setSidebarOpen } = usePanelMobileMenu();

  return (
    <div className="cabinet-mobile-top-shell relative z-10 flex w-full shrink-0 flex-col lg:hidden">
      <div className="flex items-center justify-end gap-1.5 px-3 pb-1.5 pt-[max(0.25rem,env(safe-area-inset-top,0px))]">
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
      <div className="cabinet-mobile-top-shell__gold h-px w-full shrink-0 bg-[var(--color-brand-gold)]" aria-hidden />
    </div>
  );
}
