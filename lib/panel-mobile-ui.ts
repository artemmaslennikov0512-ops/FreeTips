import type { CSSProperties } from "react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";

/** Кнопка «гамбургер» в мобильной полоске панелей (ЛК, админка, заведение) — 44×44. */
export const PANEL_MOBILE_MENU_BTN_CLASS =
  `cabinet-menu-btn ${CABINET_WAITER_BTN} flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center !gap-0 !p-0 active:scale-95 transition-[transform,opacity]`;

/** Центрированный dialog-портал: отступы под вырез (админское меню). */
export const PANEL_MOBILE_PORTAL_SAFE_PADDING_RELAXED: CSSProperties = {
  paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
  paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
};

/** Центрированный dialog-портал: компактные отступы (ЛК). */
export const PANEL_MOBILE_PORTAL_SAFE_PADDING_COMPACT: CSSProperties = {
  paddingTop: "max(0.35rem, env(safe-area-inset-top, 0px))",
  paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
};

/** Левая выдвижная шторка (ЛК, админка, кабинет заведения): отступы под safe-area. */
export const PANEL_MOBILE_LEFT_DRAWER_SHELL_STYLE: CSSProperties = {
  paddingTop: "max(0.35rem, env(safe-area-inset-top, 0px))",
  paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
  paddingLeft: "max(0.35rem, env(safe-area-inset-left, 0px))",
};

/** Единая ширина левой мобильной шторки. */
export const PANEL_MOBILE_LEFT_DRAWER_WIDTH_CLASS =
  "w-[min(22rem,calc(100vw-0.75rem-max(env(safe-area-inset-left,0px),0.35rem)-max(env(safe-area-inset-right,0px),0px)))]";

/**
 * Закрытое состояние: глубже -100% — учёт safe-area padding оболочки, тени и субпикселей
 * (иначе справа от панели остаётся полоска у левого края экрана).
 * Используйте вместе с `translate-x-0` при открытии.
 */
export const PANEL_MOBILE_LEFT_DRAWER_CLOSED_TRANSLATE_CLASS = "-translate-x-[125%]";

// --- Z-order: портал ЛК/админ (2000+) выше in-layout шторки заведения (90/100)

/** createPortal: полноэкранный корень / оверлей меню на body */
export const PANEL_MOBILE_Z_NAV_PORTAL_LAYER = "z-[2000]";

/** createPortal: центрирующая оболочка поверх оверлея */
export const PANEL_MOBILE_Z_NAV_PORTAL_SHELL = "z-[2010]";

/** Затемнение под сайдбаром в layout заведения (не портал) */
export const PANEL_MOBILE_Z_ESTABLISHMENT_OVERLAY = "z-[90]";

/** Сайдбар заведения поверх затемнения */
export const PANEL_MOBILE_Z_ESTABLISHMENT_DRAWER = "z-[100]";

/** Плавность opacity для мобильных оверлеев (max-lg) */
export const PANEL_MOBILE_NAV_OVERLAY_TRANSITION = "transition-opacity duration-300 lg:hidden";

/** Плавность оболочки центрированного dialog */
export const PANEL_MOBILE_NAV_SHELL_TRANSITION = "transition-opacity duration-200 lg:hidden";
