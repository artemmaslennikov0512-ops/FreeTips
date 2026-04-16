"use client";

import {
  PANEL_MOBILE_NAV_OVERLAY_TRANSITION,
  PANEL_MOBILE_Z_NAV_PORTAL_LAYER,
} from "@/lib/panel-mobile-ui";

type PanelMobileNavDrawerBackdropProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Полноэкранный слой под левой мобильной шторкой: тап закрывает меню.
 * Без `backdrop-blur` и без «bleed» с отрицательными inset — иначе на части экранов
 * размытие/композитинг визуально «съедают» край панели поверх шторки (z ниже панели).
 */
export function PanelMobileNavDrawerBackdrop({ open, onClose }: PanelMobileNavDrawerBackdropProps) {
  return (
    <div
      role="presentation"
      aria-hidden={!open}
      className={`fixed inset-0 min-h-[100dvh] w-full max-w-[100vw] cursor-pointer bg-black/20 ${PANEL_MOBILE_Z_NAV_PORTAL_LAYER} ${PANEL_MOBILE_NAV_OVERLAY_TRANSITION} ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    />
  );
}
