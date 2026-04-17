"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { usePanelMobileSimpleDrawerEffects } from "@/lib/use-panel-mobile-simple-drawer-effects";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { ADMIN_BTN } from "@/lib/admin-button-classes";
import { PanelMobileNavDrawerBackdrop } from "@/components/PanelMobileNavDrawerBackdrop";
import {
  PANEL_MOBILE_LEFT_DRAWER_CLOSED_TRANSLATE_CLASS,
  PANEL_MOBILE_LEFT_DRAWER_SHELL_STYLE,
  PANEL_MOBILE_LEFT_DRAWER_WIDTH_CLASS,
  PANEL_MOBILE_Z_NAV_PORTAL_SHELL,
} from "@/lib/panel-mobile-ui";
import { applyDocumentShellChrome } from "@/lib/document-shell-chrome";
import { useTheme } from "@/lib/theme-context";

type NavItem = { label: string; href: string; icon: LucideIcon; iconClass: string };
type NavGroup = { title: string; items: NavItem[] };

type User = { login: string };

export function AdminMobileNavPortal({
  sidebarOpen,
  closeSidebar,
  user,
  NAV_GROUPS,
  isActive,
  requestsPendingTotal,
  payoutsAwaitingTotal,
  handleLogout,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  user: User;
  NAV_GROUPS: NavGroup[];
  isActive: (href: string) => boolean;
  requestsPendingTotal: number | null;
  payoutsAwaitingTotal: number | null;
  handleLogout: () => Promise<void>;
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
      className={`cabinet-mobile-nav-shell admin-mobile-nav-shell pointer-events-none fixed inset-y-0 left-0 flex max-w-full flex-col overflow-x-hidden lg:hidden ${PANEL_MOBILE_Z_NAV_PORTAL_SHELL}`}
      style={PANEL_MOBILE_LEFT_DRAWER_SHELL_STYLE}
      aria-hidden={!sidebarOpen}
    >
      <div
        id="admin-nav-dropdown"
        role="dialog"
        aria-modal="false"
        aria-label="Меню навигации"
        className={`admin-mobile-nav-dialog cabinet-nav-dropdown admin-nav-dropdown cabinet-mobile-nav-dialog--drawer-left pointer-events-auto flex h-full min-h-0 ${PANEL_MOBILE_LEFT_DRAWER_WIDTH_CLASS} max-w-full flex-col overflow-hidden rounded-xl shadow-[var(--shadow-card)] transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : `pointer-events-none ${PANEL_MOBILE_LEFT_DRAWER_CLOSED_TRANSLATE_CLASS}`
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))] pt-2.5">
          <div className="cabinet-sidebar-profile cabinet-block-inner mb-3 shrink-0 rounded-lg border border-[var(--color-brand-gold)]/20 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-sm">
                {(user.login || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-sm">{user.login}</div>
                <div className="text-xs opacity-80">Админ</div>
              </div>
            </div>
          </div>
          <p className="cabinet-nav-label mb-1.5 shrink-0 px-2 text-center text-[10px] font-semibold uppercase tracking-wider opacity-60">
            Навигация
          </p>
          <div className="cabinet-mobile-nav-dialog__nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <nav
              className="cabinet-mobile-nav-dialog__nav flex flex-col gap-0 rounded-lg border border-[var(--color-brand-gold)]/15 p-1 pb-2"
              role="none"
            >
            {NAV_GROUPS.map((group) => (
              <div
                key={group.title}
                className="mt-2.5 border-t border-white/10 pt-2.5 first:mt-0 first:border-t-0 first:pt-0"
                role="group"
                aria-label={group.title}
              >
                <div className="px-2 pb-1 pt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {group.title}
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ label, href, icon: Icon, iconClass }) => {
                    const showRequestsBadge =
                      href === "/admin/verification-requests" &&
                      requestsPendingTotal != null &&
                      requestsPendingTotal > 0;
                    const requestsBadgeN = requestsPendingTotal ?? 0;
                    const showPayoutsBadge =
                      href === "/admin/payouts" && payoutsAwaitingTotal != null && payoutsAwaitingTotal > 0;
                    const payoutsBadgeN = payoutsAwaitingTotal ?? 0;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={closeSidebar}
                        role="menuitem"
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                          isActive(href)
                            ? "cabinet-nav-active font-semibold"
                            : "border border-transparent hover:bg-white/10"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
                        <span className="flex flex-1 items-center gap-2">
                          {label}
                          {showRequestsBadge && (
                            <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
                              {requestsBadgeN > 99 ? "99+" : requestsBadgeN}
                            </span>
                          )}
                          {showPayoutsBadge && (
                            <span
                              className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-none text-[#0a192f] tabular-nums ring-1 ring-amber-200/40"
                              title="Заявки на вывод в работе"
                            >
                              {payoutsBadgeN > 99 ? "99+" : payoutsBadgeN}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            </nav>
          </div>
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              void handleLogout();
            }}
            className={`mt-3 flex shrink-0 ${ADMIN_BTN} w-full items-center justify-center gap-2.5 px-2.5 py-2.5 text-sm`}
            role="menuitem"
          >
            <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </div>
    </>,
    document.body,
  );
}
