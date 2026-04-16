"use client";

import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { Menu } from "lucide-react";
import { PANEL_MOBILE_MENU_BTN_CLASS } from "@/lib/panel-mobile-ui";
import { PANEL_TOP_SHELL_GOLD_DIVIDER } from "@/lib/panel-shell-visual-classes";

type PanelMobileTopChromeProps = {
  leadingSlot?: ReactNode;
  /** Слот справа (например переключатель темы в ЛК) */
  trailingSlot?: ReactNode;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  ariaControls: string;
  ariaHaspopup?: "dialog" | "true";
  /** Доп. классы на кнопку меню (например `site-header-m5-menu-btn`) */
  menuButtonExtraClassName?: string;
  /** `start` — только меню слева; `end` — ведущий слот слева (например «Назад»), меню справа рядом с trailing. */
  menuPlacement?: "start" | "end";
};

/** Мобильная полоска: safe-area; варианты выравнивания меню — см. `menuPlacement`. */
export function PanelMobileTopChrome({
  leadingSlot,
  trailingSlot,
  menuButtonRef,
  sidebarOpen,
  setSidebarOpen,
  ariaControls,
  ariaHaspopup = "dialog",
  menuButtonExtraClassName = "",
  menuPlacement = "end",
}: PanelMobileTopChromeProps) {
  const menuBtn = (
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
  );

  return (
    <div className="cabinet-mobile-top-shell relative z-10 flex w-full shrink-0 flex-col pb-3 pt-[max(0px,env(safe-area-inset-top,0px))] lg:hidden">
      <div className="flex w-full min-w-0 items-center gap-2 px-3 pb-3 pt-1.5">
        {menuPlacement === "start" ? (
          <>
            <div className="flex shrink-0 items-center">{menuBtn}</div>
            <div className="flex min-w-0 flex-1 items-center justify-start">{leadingSlot}</div>
            {trailingSlot ? (
              <div className="flex max-w-[min(17.5rem,62vw)] shrink-0 items-center">{trailingSlot}</div>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center justify-start">{leadingSlot}</div>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              {trailingSlot ? (
                <div className="flex max-w-[min(17.5rem,62vw)] shrink-0 items-center">{trailingSlot}</div>
              ) : null}
              {menuBtn}
            </div>
          </>
        )}
      </div>
      <div className={`cabinet-mobile-top-shell__gold ${PANEL_TOP_SHELL_GOLD_DIVIDER}`} aria-hidden />
    </div>
  );
}
