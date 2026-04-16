"use client";

import type { ReactNode } from "react";
import { PanelMobileTopChrome } from "@/components/PanelMobileTopChrome";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";

type PanelShellMobileCornerProps = {
  ariaControls: string;
  /** Для aria-haspopup: сайдбар заведения — не dialog */
  ariaHaspopup?: "dialog" | "true";
  menuButtonClassName?: string;
  /** Например «Назад» — слева; без слота гамбургер слева (`start`), со слотом — как в ЛК при подстранице (`end`). */
  leadingSlot?: ReactNode;
};

/** Фиксированная зона: на корнях разделов — меню слева; на подстраницах — «Назад» слева, меню справа. */
export function PanelShellMobileCorner({
  ariaControls,
  ariaHaspopup = "dialog",
  menuButtonClassName = "",
  leadingSlot,
}: PanelShellMobileCornerProps) {
  const { menuButtonRef, sidebarOpen, setSidebarOpen } = usePanelMobileMenu();

  return (
    <PanelMobileTopChrome
      leadingSlot={leadingSlot}
      menuButtonRef={menuButtonRef}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      ariaControls={ariaControls}
      ariaHaspopup={ariaHaspopup}
      menuButtonExtraClassName={menuButtonClassName}
      menuPlacement={leadingSlot ? "end" : "start"}
    />
  );
}
