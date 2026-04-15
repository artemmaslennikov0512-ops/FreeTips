"use client";

import { useLayoutEffect } from "react";
import { popOverlaySafariChromeDark, pushOverlaySafariChromeDark } from "@/lib/document-shell-chrome";

/** Пока открыт тёмный оверлей: тёмный `color-scheme` + снятие `theme-color` на панели (счётчик в document-shell-chrome). */
export function useMobileDarkChromeOverlay(open: boolean): void {
  useLayoutEffect(() => {
    if (!open) return;
    pushOverlaySafariChromeDark();
    return () => {
      popOverlaySafariChromeDark();
    };
  }, [open]);
}
