"use client";

import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PANEL_MOBILE_MENU_BTN_CLASS } from "@/lib/panel-mobile-ui";
import { PANEL_TOP_SHELL_GOLD_DIVIDER } from "@/lib/panel-shell-visual-classes";

type PanelMobileTopChromeProps = {
  leadingSlot?: ReactNode;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  ariaControls: string;
  ariaHaspopup?: "dialog" | "true";
  /** Доп. классы на кнопку меню (например `site-header-m5-menu-btn`) */
  menuButtonExtraClassName?: string;
  themeToggleVariant?: "default" | "m5";
};

/** Общая мобильная полоска: safe-area, «Назад» слева, тема + меню справа, золотая линия снизу. */
export function PanelMobileTopChrome({
  leadingSlot,
  menuButtonRef,
  sidebarOpen,
  setSidebarOpen,
  ariaControls,
  ariaHaspopup = "dialog",
  menuButtonExtraClassName = "",
  themeToggleVariant = "default",
}: PanelMobileTopChromeProps) {
  return (
    <div className="cabinet-mobile-top-shell relative z-10 flex w-full shrink-0 flex-col pb-3 lg:hidden">
      <div className="flex w-full min-w-0 items-center gap-2 px-3 pb-3 pt-[max(0.35rem,env(safe-area-inset-top,0px))]">
        <div className="flex min-w-0 flex-1 items-center justify-start">{leadingSlot}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle variant={themeToggleVariant} />
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className={`${PANEL_MOBILE_MENU_BTN_CLASS} ${menuButtonExtraClassName}`.trim()}
            aria-label="Меню"
            aria-expanded={sidebarOpen}
            aria-haspopup={ariaHaspopup}
            aria-controls={ariaControls}
          >
            <Menu className="h-5 w-5 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
      <div className={`cabinet-mobile-top-shell__gold ${PANEL_TOP_SHELL_GOLD_DIVIDER}`} aria-hidden />
    </div>
  );
}
