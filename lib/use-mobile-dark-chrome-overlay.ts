"use client";

import { useLayoutEffect } from "react";
import { popOverlaySafariChromeDark, pushOverlaySafariChromeDark } from "@/lib/document-shell-chrome";

/**
 * Пока `open` — тёмный `theme-color` / `color-scheme` для Safari (счётчик в document-shell-chrome).
 * Вызывать из любого клиентского полноэкранного оверлея с тёмным затемнением на мобильном.
 */
export function useMobileDarkChromeOverlay(open: boolean): void {
  useLayoutEffect(() => {
    if (!open) return;
    pushOverlaySafariChromeDark();
    return () => {
      popOverlaySafariChromeDark();
    };
  }, [open]);
}
