"use client";

import { useLayoutEffect } from "react";
import { popOverlaySafariChromeDark, pushOverlaySafariChromeDark } from "@/lib/document-shell-chrome";

/** Тёмный Safari `theme-color` пока открыт полноэкранный тёмный оверлей (счётчик в document-shell-chrome). */
export function useMobileDarkChromeOverlay(open: boolean): void {
  useLayoutEffect(() => {
    if (!open) return;
    pushOverlaySafariChromeDark();
    return () => {
      popOverlaySafariChromeDark();
    };
  }, [open]);
}
