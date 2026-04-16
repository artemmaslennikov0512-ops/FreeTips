"use client";

import { useEffect } from "react";
import { useMobileDarkChromeOverlay } from "@/lib/use-mobile-dark-chrome-overlay";

/**
 * Мобильные шторки панелей: ЛК официанта (`CabinetMobileNavPortals`), админка (`AdminMobileNavPortal`),
 * кабинет заведения (`establishment/layout`). Тёмный chrome + фиксация body + Escape — иначе iOS даёт
 * швы у safe-area и после закрытия «подхватывает» цвета.
 */
export function usePanelMobileSimpleDrawerEffects(open: boolean, onRequestClose: () => void): void {
  useMobileDarkChromeOverlay(open);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;

    html.classList.add("cabinet-mobile-drawer-lock");
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.classList.remove("cabinet-mobile-drawer-lock");
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [open, onRequestClose]);
}
