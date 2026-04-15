"use client";

import type { ReactNode } from "react";
import { PanelMobileTopChrome } from "@/components/PanelMobileTopChrome";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";

type PanelShellMobileCornerProps = {
  ariaControls: string;
  /** Для aria-haspopup: сайдбар заведения — не dialog */
  ariaHaspopup?: "dialog" | "true";
  menuButtonClassName?: string;
  /** Например «Назад» — слева в одной строке с темой и меню */
  leadingSlot?: ReactNode;
};

/** Фиксированная зона: тема + меню, под ними золотая полоса на всю ширину (админка, кабинет заведения). */
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
      themeToggleVariant="default"
    />
  );
}
