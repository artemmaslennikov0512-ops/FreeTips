"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { PanelSidebarThemeSwitch } from "@/components/PanelSidebarThemeSwitch";
import { usePanelMobileSimpleDrawerEffects } from "@/lib/use-panel-mobile-simple-drawer-effects";
import { applyDocumentShellChrome } from "@/lib/document-shell-chrome";
import { useTheme } from "@/lib/theme-context";
import { PanelMobileNavDrawerBackdrop } from "@/components/PanelMobileNavDrawerBackdrop";
import {
  PANEL_MOBILE_LEFT_DRAWER_CLOSED_TRANSLATE_CLASS,
  PANEL_MOBILE_LEFT_DRAWER_SHELL_STYLE,
  PANEL_MOBILE_LEFT_DRAWER_WIDTH_CLASS,
  PANEL_MOBILE_Z_NAV_PORTAL_SHELL,
} from "@/lib/panel-mobile-ui";
import {
  PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT,
  PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE,
} from "@/lib/panel-shell-visual-classes";

export type EstablishmentMobileNavGroup = {
  title: string;
  items: { label: string; href: string; icon: LucideIcon }[];
};

export function EstablishmentMobileNavPortal({
  sidebarOpen,
  closeSidebar,
  navGroups,
  isActive,
  handleLogout,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  navGroups: EstablishmentMobileNavGroup[];
  isActive: (href: string) => boolean;
  handleLogout: () => void;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  usePanelMobileSimpleDrawerEffects(sidebarOpen, closeSidebar);

  useEffect(() => {
    if (!sidebarOpen) return;
    applyDocumentShellChrome(pathname, theme);
  }, [sidebarOpen, pathname, theme]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <PanelMobileNavDrawerBackdrop open={sidebarOpen} onClose={closeSidebar} />
    <div
      className={`cabinet-mobile-nav-shell establishment-mobile-nav-shell pointer-events-none fixed inset-y-0 left-0 flex max-w-full flex-col overflow-x-hidden lg:hidden ${PANEL_MOBILE_Z_NAV_PORTAL_SHELL}`}
      style={PANEL_MOBILE_LEFT_DRAWER_SHELL_STYLE}
      aria-hidden={!sidebarOpen}
    >
      <aside
        id="establishment-mobile-nav"
        role="dialog"
        aria-modal="false"
        aria-label="Меню кабинета заведения"
        className={`cabinet-sidebar establishment-mobile-sidebar pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl transition-[transform] duration-300 ease-out max-lg:h-full max-lg:max-h-none max-lg:py-2 ${PANEL_MOBILE_LEFT_DRAWER_WIDTH_CLASS} max-w-full ${
          sidebarOpen ? "translate-x-0" : `pointer-events-none ${PANEL_MOBILE_LEFT_DRAWER_CLOSED_TRANSLATE_CLASS}`
        }`}
      >
        <div className="mb-2 w-full shrink-0 px-2.5 text-center max-lg:mb-1.5">
          <span className={PANEL_ESTABLISHMENT_SIDEBAR_TITLE_LINE}>Кабинет заведения</span>
        </div>
        <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overscroll-y-contain px-2.5 pb-1.5">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <nav
              className="flex flex-col gap-0 rounded-lg border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1 pb-1.5 shadow-[var(--shadow-subtle)]"
              aria-label="Навигация по кабинету заведения"
            >
            {navGroups.map((group) => (
              <div
                key={group.title}
                className="mt-2 border-t border-white/[0.08] pt-2 first:mt-0 first:border-t-0 first:pt-0"
                role="group"
                aria-label={group.title}
              >
                <div className="px-2 pb-1 pt-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-white/40">
                  {group.title}
                </div>
                <div className="flex flex-col gap-px">
                  {group.items.map(({ label, href, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeSidebar}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-[0.4375rem] text-sm font-normal leading-snug transition-colors ${
                        isActive(href)
                          ? "cabinet-nav-active border font-medium text-white/90 max-lg:text-[#0a192f]"
                          : "border border-transparent text-white/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
                      }`}
                    >
                      <Icon className="cabinet-nav-item-icon size-[1.125rem] shrink-0" aria-hidden />
                      <span className="min-w-0 break-words">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            </nav>
          </div>
          <PanelSidebarThemeSwitch className="mt-3 px-2.5" />
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              void handleLogout();
            }}
            className={PANEL_ESTABLISHMENT_SIDEBAR_LOGOUT}
          >
            <LogOut className="size-4 shrink-0" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>
    </div>
    </>,
    document.body,
  );
}
