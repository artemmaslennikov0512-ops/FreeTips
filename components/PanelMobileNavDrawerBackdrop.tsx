"use client";

import {
  PANEL_MOBILE_NAV_OVERLAY_TRANSITION,
  PANEL_MOBILE_Z_NAV_PORTAL_LAYER,
} from "@/lib/panel-mobile-ui";

type PanelMobileNavDrawerBackdropProps = {
  open: boolean;
  onClose: () => void;
};

/** Полноэкранный слой под левой мобильной шторкой: тап по затемнению закрывает меню. */
export function PanelMobileNavDrawerBackdrop({ open, onClose }: PanelMobileNavDrawerBackdropProps) {
  return (
    <div
      role="presentation"
      aria-hidden={!open}
      className={`fixed inset-0 cursor-pointer bg-black/25 backdrop-blur-sm ${PANEL_MOBILE_Z_NAV_PORTAL_LAYER} ${PANEL_MOBILE_NAV_OVERLAY_TRANSITION} ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
    />
  );
}
