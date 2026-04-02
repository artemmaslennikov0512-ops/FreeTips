"use client";

import { useEffect, useState, useCallback } from "react";
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
  handleLogout,
}: {
  sidebarOpen: boolean;
  closeSidebar: () => void;
  user: User;
  NAV: NavItem[];
  isActive: (href: string) => boolean;
  requestsPendingTotal: number | null;
  handleLogout: () => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
    <>
      <div
        className={`fixed inset-0 z-[2000] bg-[rgba(15,23,42,0.72)] backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onOverlayDown}
        role="presentation"
        aria-hidden={!sidebarOpen}
      />
      <div
        id="admin-nav-dropdown"
        role="dialog"
        aria-modal="true"
        aria-label="Меню навигации"
        className={`cabinet-nav-dropdown admin-nav-dropdown fixed left-1/2 top-1/2 z-[2010] w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(85dvh,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-navy)] shadow-[var(--shadow-card)] backdrop-blur-xl transition-[opacity,transform] duration-200 lg:hidden ${
          sidebarOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="cabinet-nav-dropdown-inner overflow-hidden rounded-xl p-3 text-white">
          <div className="cabinet-sidebar-profile cabinet-block-inner mb-3 rounded-lg border border-[var(--color-brand-gold)]/20 bg-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-sm">
                {(user.login || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white text-sm">{user.login}</div>
                <div className="text-xs text-white/80">Админ</div>
              </div>
            </div>
          </div>
          <p className="cabinet-nav-label mb-1.5 px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-white/50">Навигация</p>
          <nav className="flex flex-col gap-0.5 rounded-lg border border-[var(--color-brand-gold)]/15 bg-white/5 p-1" role="none">
            {NAV.map(({ label, href, icon: Icon, iconClass }) => {
              const showRequestsBadge =
                href === "/admin/verification-requests" && requestsPendingTotal != null && requestsPendingTotal > 0;
              const badgeN = requestsPendingTotal ?? 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeSidebar}
                  role="menuitem"
                  className={`flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors ${
                    isActive(href) ? "cabinet-nav-active bg-white/15 text-white font-semibold" : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
                  <span className="flex flex-1 items-center gap-2">
                    {label}
                    {showRequestsBadge && (
                      <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
                        {badgeN > 99 ? "99+" : badgeN}
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
    </>,
    document.body,
  );
}
