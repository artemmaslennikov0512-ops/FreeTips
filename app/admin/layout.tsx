"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  LayoutDashboard,
  Send,
  Users,
  ShieldCheck,
  MessageCircle,
  Building2,
  FileCheck,
  CreditCard,
  KeyRound,
  Laptop,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getAccessToken, fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AdminMobileNavPortal } from "@/components/admin/AdminMobileNavPortal";
import { ADMIN_REQUESTS_COUNTS_CHANGED } from "@/lib/admin-requests-counts-sync";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";

interface User {
  id: string;
  login: string;
  email?: string | null;
  role: string;
  mustChangePassword?: boolean;
}

const NAV: { label: string; href: string; icon: LucideIcon; iconClass: string }[] = [
  { label: "Дашборд", href: "/admin/dashboard", icon: LayoutDashboard, iconClass: "!text-sky-400" },
  { label: "Заведения", href: "/admin/establishments", icon: Building2, iconClass: "!text-amber-400" },
  { label: "Выводы", href: "/admin/payouts", icon: Send, iconClass: "!text-emerald-400" },
  { label: "Пользователи", href: "/admin/users", icon: Users, iconClass: "!text-violet-400" },
  { label: "Заявки", href: "/admin/verification-requests", icon: FileCheck, iconClass: "!text-blue-400" },
  { label: "Поддержка", href: "/admin/support", icon: MessageCircle, iconClass: "!text-cyan-400" },
  { label: "Антифрод", href: "/admin/antifraud", icon: ShieldCheck, iconClass: "!text-rose-400" },
  { label: "Приём по ссылкам", href: "/admin/payment-accept", icon: CreditCard, iconClass: "!text-[var(--color-brand-gold)]" },
  { label: "Безопасность (2FA)", href: "/admin/security", icon: KeyRound, iconClass: "!text-amber-300" },
  { label: "Сессии", href: "/admin/sessions", icon: Laptop, iconClass: "!text-slate-300" },
];

const ADMIN_LG_SIDEBAR_COLLAPSED_KEY = "admin-lg-sidebar-collapsed";

const LG_SIDEBAR_COLLAPSE_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--collapse relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/40 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const LG_SIDEBAR_EXPAND_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--expand fixed left-0 top-1/2 z-[35] hidden h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/25 bg-[var(--color-navy)] text-white shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/40 hover:bg-white/[0.12] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:flex";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = usePanelMobileMenu();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  /** Сумма pending по верификации и подключению — бейдж у пункта «Заявки». */
  const [requestsPendingTotal, setRequestsPendingTotal] = useState<number | null>(null);
  /** Заявки на вывод в работе — бейдж у пункта «Выводы». */
  const [payoutsAwaitingTotal, setPayoutsAwaitingTotal] = useState<number | null>(null);
  const [lgSidebarCollapsed, setLgSidebarCollapsed] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      if (localStorage.getItem(ADMIN_LG_SIDEBAR_COLLAPSED_KEY) === "1") setLgSidebarCollapsed(true);
    } catch {
      /* ignore */
    }
  }, [mounted]);

  const setSidebarCollapsedPersisted = useCallback((collapsed: boolean) => {
    setLgSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(ADMIN_LG_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("cabinet-page", "admin-page");
    return () => document.body.classList.remove("cabinet-page", "admin-page");
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    const checkAuth = async () => {
      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetchWithAuth("/api/profile");

        if (res.status === 401 || res.status === 403) {
          clearAccessToken();
          router.replace("/login");
          return;
        }

        if (!res.ok) {
          let msg = "Не удалось загрузить данные.";
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody?.error) msg += ` ${errBody.error}`;
            msg += ` Код ответа: ${res.status}. Нажмите «Повторить» или проверьте логи сервера.`;
          } catch {
            msg += ` Код ответа: ${res.status}. Нажмите «Повторить» или проверьте логи сервера.`;
          }
          setLoadError(msg);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setUser(data);

        if (data.role !== "SUPERADMIN") {
          router.replace("/cabinet");
          return;
        }

        if (data.mustChangePassword) {
          router.replace("/change-password");
          return;
        }
      } catch {
        setLoadError("Ошибка соединения. Проверьте подключение и нажмите «Повторить».");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [mounted, retryTrigger, router]);

  const refreshRequestsPendingTotal = useCallback(async () => {
    if (!user || user.role !== "SUPERADMIN") return;
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/requests-counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { totalPending?: number; payoutsAwaitingAction?: number };
      setRequestsPendingTotal(typeof data.totalPending === "number" ? data.totalPending : 0);
      setPayoutsAwaitingTotal(
        typeof data.payoutsAwaitingAction === "number" ? data.payoutsAwaitingAction : 0,
      );
    } catch {
      setRequestsPendingTotal(null);
      setPayoutsAwaitingTotal(null);
    }
  }, [user]);

  useEffect(() => {
    void refreshRequestsPendingTotal();
  }, [pathname, refreshRequestsPendingTotal]);

  useEffect(() => {
    const onCountsChanged = () => {
      void refreshRequestsPendingTotal();
    };
    window.addEventListener(ADMIN_REQUESTS_COUNTS_CHANGED, onCountsChanged);
    return () => window.removeEventListener(ADMIN_REQUESTS_COUNTS_CHANGED, onCountsChanged);
  }, [refreshRequestsPendingTotal]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: "{}",
        credentials: "include",
      });
    } finally {
      clearAccessToken();
      router.replace("/");
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === "/admin/dashboard" || pathname === "/admin";
    return pathname?.startsWith(href) ?? false;
  };

  if (!mounted || loading) {
    return <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-[var(--color-text)]">
        <p className="text-center text-[var(--color-text-secondary)]">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
          className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-6 py-2.5 font-medium`}
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!user || user.role !== "SUPERADMIN") {
    return null;
  }

  return (
    <div className="admin-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-2 lg:pt-4">
      <LkPresenceHeartbeat />
      <AdminMobileNavPortal
        sidebarOpen={sidebarOpen}
        closeSidebar={closeSidebar}
        user={user}
        NAV={NAV}
        isActive={isActive}
        requestsPendingTotal={requestsPendingTotal}
        payoutsAwaitingTotal={payoutsAwaitingTotal}
        handleLogout={handleLogout}
      />

      {/* Боковая панель — lg+; сворачивание как в ЛК официанта; на мобильном — модалка */}
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:mt-2 lg:flex lg:self-start ${
          lgSidebarCollapsed
            ? "lg:w-0 lg:pointer-events-none lg:overflow-hidden"
            : "lg:relative lg:z-10 lg:w-[236px] lg:overflow-hidden"
        }`}
      >
        <aside className="admin-sidebar cabinet-sidebar relative flex h-full min-h-0 w-[236px] min-w-[236px] flex-col overflow-hidden rounded-[10px] border border-white/10 bg-[var(--color-navy)] py-4 shadow-sm backdrop-blur-xl lg:static lg:max-h-[calc(100vh-2rem)]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="cabinet-sidebar-profile cabinet-block-inner mx-3 mb-3 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="cabinet-sidebar-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-sm">
                {(user.login || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-white">{user.login}</div>
                <div className="text-sm text-white/80">Админ</div>
              </div>
            </div>
          </div>
          <div className="mb-2 flex h-9 shrink-0 items-center px-3">
            <span className="w-9 shrink-0 select-none" aria-hidden />
            <span className="cabinet-nav-label min-w-0 flex-1 text-center text-xs font-medium uppercase leading-none tracking-wider text-white/50">
              Навигация
            </span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-end">
              <button
                type="button"
                onClick={() => setSidebarCollapsedPersisted(true)}
                className={LG_SIDEBAR_COLLAPSE_BTN}
                aria-label="Скрыть боковое меню"
                title="Скрыть меню"
              >
                <ChevronLeft className="h-5 w-5 shrink-0 text-white" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 pb-2">
            <nav className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-white/5 p-1.5 shadow-[var(--shadow-subtle)]" aria-label="Навигация админ-панели">
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
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.9375rem] font-normal transition-colors ${
                      isActive(href)
                        ? "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-medium"
                        : "border border-transparent text-white/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
                    }`}
                  >
                    <Icon className={`cabinet-nav-item-icon h-[18px] w-[18px] shrink-0 ${iconClass}`} aria-hidden />
                    <span className="flex min-w-0 flex-1 items-center gap-2 break-words">
                      {label}
                      {showRequestsBadge && (
                        <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[11px] font-bold leading-none text-white tabular-nums">
                          {requestsBadgeN > 99 ? "99+" : requestsBadgeN}
                        </span>
                      )}
                      {showPayoutsBadge && (
                        <span
                          className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-none text-[#0a192f] tabular-nums ring-1 ring-amber-200/40"
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
              onClick={handleLogout}
              className={`mt-8 ${ADMIN_BTN} w-full !justify-center gap-2.5 px-3 py-2 text-sm`}
            >
              <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
              <span>Выйти</span>
            </button>
          </div>
        </div>
        </aside>
      </div>

      {lgSidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsedPersisted(false)}
          className={LG_SIDEBAR_EXPAND_BTN}
          aria-label="Показать боковое меню"
          title="Меню"
        >
          <ChevronRight className="h-5 w-5 shrink-0 text-white" strokeWidth={2} aria-hidden />
        </button>
      )}

      <main className="relative min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-1.5 pb-3 lg:relative lg:z-0 lg:pt-2 lg:pl-0 lg:pr-3 lg:ml-0 lg:mr-0 flex flex-col">
        <div className="admin-main-block cabinet-main-block app-panel-main-surface relative z-10 mt-0 mr-0 mb-3 ml-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col rounded-lg border-x border-b border-white/10 bg-white/[0.06] backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-3 lg:ml-3 lg:rounded-[10px]">
          {pathname !== "/admin/dashboard" && (
            <PanelMobileBackButton variant="admin" fallbackHref="/admin/dashboard" />
          )}
          <div
            className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-x-hidden px-4 py-3 sm:px-6 md:py-6 lg:p-8"
            id="main-content"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
