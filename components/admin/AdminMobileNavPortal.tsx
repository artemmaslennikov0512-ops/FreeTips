"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

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
  shellTheme,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  user: User;
  NAV: NavItem[];
  isActive: (href: string) => boolean;
  requestsPendingTotal: number | null;
  payoutsAwaitingTotal: number | null;
  handleLogout: () => Promise<void>;
  shellTheme: "light" | "dark";
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
      className={`test-lk-mock-root fixed inset-0 z-[2000] font-[family:var(--font-inter)] lg:hidden ${sidebarOpen ? "" : "pointer-events-none"}`}
      data-tlk-theme={shellTheme}
      aria-hidden={!sidebarOpen}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ backgroundColor: "var(--tlk-mobile-scrim)" }}
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
          className={`pointer-events-auto w-[min(calc(100vw-1.5rem),22rem)] shrink-0 rounded-xl border shadow-lg transition-[opacity,transform] duration-200 ${
            sidebarOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
          }`}
          style={{
            borderColor: "var(--tlk-panel-border)",
            backgroundColor: "var(--tlk-panel-bg)",
            color: "var(--tlk-text)",
            backdropFilter: "blur(12px)",
          }}
          aria-hidden={!sidebarOpen}
        >
          <div className="rounded-xl p-3">
            <div
              className="mb-3 rounded-lg border px-3 py-2.5"
              style={{ borderColor: "var(--tlk-profile-border)", backgroundColor: "var(--tlk-profile-bg)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ backgroundColor: "var(--tlk-accent)", color: "var(--tlk-expand-fab-bg)" }}
                >
                  {(user.login || "A").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="tlk-type-profile-name truncate">{user.login}</div>
                  <div className="tlk-type-profile-meta mt-0.5">Суперадмин</div>
                </div>
              </div>
            </div>
            <p className="tlk-type-nav-heading mb-1.5 px-2 text-center">Навигация</p>
            <nav className="flex flex-col gap-0.5 rounded-lg border p-1" style={{ borderColor: "var(--tlk-border)" }} role="none">
              {NAV.map(({ label, href, icon: Icon }) => {
                const showRequestsBadge =
                  href === "/admin/verification-requests" && requestsPendingTotal != null && requestsPendingTotal > 0;
                const requestsBadgeN = requestsPendingTotal ?? 0;
                const showPayoutsBadge =
                  href === "/admin/payouts" && payoutsAwaitingTotal != null && payoutsAwaitingTotal > 0;
                const payoutsBadgeN = payoutsAwaitingTotal ?? 0;
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeSidebar}
                    role="menuitem"
                    className={`tlk-transition flex items-center gap-2.5 rounded-md px-2.5 py-2 font-medium ${
                      active ? "border font-semibold shadow-sm" : "border border-transparent hover:bg-[var(--tlk-sidebar-active-bg)]"
                    }`}
                    style={
                      active
                        ? {
                            borderColor: "color-mix(in srgb, var(--tlk-accent) 35%, transparent)",
                            backgroundColor: "var(--tlk-accent-soft)",
                            color: "var(--tlk-text)",
                          }
                        : { color: "var(--tlk-text)" }
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--tlk-primary)" }} aria-hidden />
                    <span className="tlk-type-body flex min-w-0 flex-1 items-center gap-2 leading-snug">
                      {label}
                      {showRequestsBadge && (
                        <span
                          className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none text-white tabular-nums"
                          style={{ backgroundColor: "var(--tlk-unread-badge)" }}
                        >
                          {requestsBadgeN > 99 ? "99+" : requestsBadgeN}
                        </span>
                      )}
                      {showPayoutsBadge && (
                        <span
                          className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none tabular-nums ring-1"
                          style={{
                            backgroundColor: "var(--tlk-accent-soft)",
                            color: "var(--tlk-text)",
                            borderColor: "var(--tlk-border)",
                          }}
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
              className="tlk-type-body tlk-transition mt-3 flex w-full items-center justify-center gap-2.5 rounded-lg border px-2.5 py-2.5 font-medium"
              style={{
                borderColor: "var(--tlk-border)",
                color: "var(--tlk-text)",
                backgroundColor: "var(--tlk-nav-wrap-bg)",
              }}
              role="menuitem"
            >
              <LogOut className="h-4 w-4 shrink-0" style={{ color: "var(--tlk-accent)" }} aria-hidden />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
