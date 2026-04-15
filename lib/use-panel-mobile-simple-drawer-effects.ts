"use client";

import { useEffect } from "react";
import { useMobileDarkChromeOverlay } from "@/lib/use-mobile-dark-chrome-overlay";

/** Скролл body + Escape + тёмный Safari theme-color для простой шторки (не как `CabinetMobileNavPortals` с fixed body). */
export function usePanelMobileSimpleDrawerEffects(open: boolean, onRequestClose: () => void): void {
  useMobileDarkChromeOverlay(open);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onRequestClose]);
}
