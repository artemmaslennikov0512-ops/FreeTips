"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { ADMIN_BTN } from "@/lib/admin-button-classes";

type NavItem = { label: string; href: string; icon: LucideIcon; iconClass: string };

type User = { login: string };

export function AdminMobileNavPortal({
  sidebarOpen,
  closeSidebar,
  user,
  NAV,
  isActive,
  requestsPendingTotal,
  payoutsAwaitingTotal,
  handleLogout,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  user: User;
  NAV: NavItem[];
  isActive: (href: string) => boolean;
  requestsPendingTotal: number | null;
  payoutsAwaitingTotal: number | null;
  handleLogout: () => Promise<void>;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen, closeSidebar]);

  const onOverlayDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) closeSidebar();
    },
    [closeSidebar],
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`admin-mobile-nav-root fixed inset-0 z-[2000] lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!sidebarOpen}
    >
      <div
        className={`admin-mobile-nav-overlay absolute inset-0 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onOverlayDown}
        role="presentation"
      />
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-3"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          id="admin-nav-dropdown"
          role="dialog"
          aria-modal="true"
          aria-label="Меню навигации"
          className={`admin-mobile-nav-dialog cabinet-nav-dropdown admin-nav-dropdown pointer-events-auto w-[min(calc(100vw-1.5rem),22rem)] shrink-0 rounded-xl border border-[var(--color-brand-gold)]/20 shadow-[var(--shadow-card)] transition-[opacity,transform] duration-200 ${
            sidebarOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          }`}
          aria-hidden={!sidebarOpen}
        >
          <div className="rounded-xl p-3">
            <div className="cabinet-sidebar-profile cabinet-block-inner mb-3 rounded-lg border border-[var(--color-brand-gold)]/20 px-3 py-2.5">
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
            <p className="cabinet-nav-label mb-1.5 px-2 text-center text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Навигация
            </p>
            <nav className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-brand-gold)]/15 p-1" role="none">
              {NAV.map(({ label, href, icon: Icon, iconClass }) => {
                const showRequestsBadge =
                  href === "/admin/verification-requests" && requestsPendingTotal != null && requestsPendingTotal > 0;
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
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors ${
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
            </nav>
            <button
              type="button"
              onClick={() => {
                closeSidebar();
                void handleLogout();
              }}
              className={`mt-3 ${ADMIN_BTN} w-full !justify-center gap-2.5 px-2.5 py-2.5 text-sm`}
              role="menuitem"
            >
              <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
