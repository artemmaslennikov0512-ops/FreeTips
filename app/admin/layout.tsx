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
import { usePanelMobileMenu } from "@/components/PanelMobileMenuContext";
import { LkPresenceHeartbeat } from "@/components/LkPresenceHeartbeat";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import { AdminShellThemeProvider, useAdminShellTheme } from "./AdminShellThemeContext";
import { AdminShellThemeToggle } from "./AdminShellThemeToggle";
import "../test-lk-mock/test-lk-mock.css";

interface User {
  id: string;
  login: string;
  email?: string | null;
  role: string;
  mustChangePassword?: boolean;
}

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Дашборд", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Заведения", href: "/admin/establishments", icon: Building2 },
  { label: "Выводы", href: "/admin/payouts", icon: Send },
  { label: "Пользователи", href: "/admin/users", icon: Users },
  { label: "Заявки", href: "/admin/verification-requests", icon: FileCheck },
  { label: "Поддержка", href: "/admin/support", icon: MessageCircle },
  { label: "Антифрод", href: "/admin/antifraud", icon: ShieldCheck },
  { label: "Приём по ссылкам", href: "/admin/payment-accept", icon: CreditCard },
  { label: "Безопасность (2FA)", href: "/admin/security", icon: KeyRound },
  { label: "Сессии", href: "/admin/sessions", icon: Laptop },
];

const ADMIN_LG_SIDEBAR_COLLAPSED_KEY = "admin-lg-sidebar-collapsed";

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = usePanelMobileMenu();
  const { shellTheme } = useAdminShellTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [requestsPendingTotal, setRequestsPendingTotal] = useState<number | null>(null);
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

  const collapseBtn =
    "relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--tlk-text)] shadow-none transition-[color,background-color,border-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const expandBtnClass =
    "fixed left-0 top-1/2 z-[35] hidden h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border shadow-none transition-[color,background-color,border-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:flex";

  if (!mounted || loading) {
    return <LoadingSpinner message="Загрузка…" className="min-h-[60vh]" />;
  }

  if (loadError) {
    return (
      <div
        className="test-lk-mock-root flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 font-[family:var(--font-inter)]"
        data-tlk-theme="light"
      >
        <p className="tlk-type-body-muted text-center">{loadError}</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setLoading(true);
            setRetryTrigger((t) => t + 1);
          }}
          className="tlk-transition rounded-lg px-6 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/40"
          style={{
            backgroundColor: "var(--tlk-primary)",
            color: "var(--tlk-expand-fab-bg)",
          }}
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
    <div
      className="test-lk-mock-root admin-panel flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden pt-3 font-[family:var(--font-inter)] lg:pt-5"
      data-tlk-theme={shellTheme}
      style={{ backgroundColor: "var(--tlk-shell-bg)", color: "var(--tlk-text)" }}
    >
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
        shellTheme={shellTheme}
      />

      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:mt-3 lg:flex lg:self-start ${
          lgSidebarCollapsed
            ? "lg:w-0 lg:pointer-events-none lg:overflow-hidden"
            : "lg:relative lg:z-10 lg:w-[260px] lg:overflow-hidden"
        }`}
      >
        <aside
          className="relative flex w-[260px] min-w-[260px] flex-col overflow-hidden border-r py-4 lg:static lg:max-h-[min(100vh-1.5rem,900px)] lg:pt-2"
          style={{ borderColor: "var(--tlk-panel-border)" }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mx-4 border-b px-0 pb-3" style={{ borderColor: "var(--tlk-panel-border)" }}>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  style={{ backgroundColor: "var(--tlk-accent)", color: "var(--tlk-expand-fab-bg)" }}
                  aria-hidden
                >
                  {(user.login || "A").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="tlk-type-profile-name block truncate">{user.login}</span>
                  <div className="tlk-type-profile-meta mt-0.5">Суперадмин</div>
                </div>
              </div>
            </div>

            <div className="mb-1 mt-3 flex h-8 shrink-0 items-center px-4">
              <span className="w-9 shrink-0 select-none" aria-hidden />
              <span className="tlk-type-nav-heading min-w-0 flex-1 text-center">Навигация</span>
              <div className="flex h-8 w-9 shrink-0 items-center justify-end">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsedPersisted(true)}
                  className={collapseBtn}
                  style={{ borderColor: "var(--tlk-panel-border)", backgroundColor: "var(--tlk-nav-wrap-bg)" }}
                  aria-label="Скрыть боковое меню"
                  title="Скрыть меню"
                >
                  <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3">
              <nav
                className="flex min-h-0 flex-1 flex-col justify-center gap-0.5 overflow-hidden py-1"
                aria-label="Навигация админ-панели"
              >
                {NAV.map(({ label, href, icon: Icon }) => {
                  const active = isActive(href);
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
                      className={`tlk-transition flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 font-medium ${
                        active
                          ? "border font-semibold shadow-sm"
                          : "border border-transparent text-[var(--tlk-text)]/85 hover:bg-[var(--tlk-sidebar-active-bg)] hover:text-[var(--tlk-text)]"
                      }`}
                      style={
                        active
                          ? {
                              borderColor: "color-mix(in srgb, var(--tlk-accent) 35%, transparent)",
                              backgroundColor: "var(--tlk-accent-soft)",
                              color: "var(--tlk-text)",
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--tlk-primary)" }} aria-hidden />
                      <span className="tlk-type-body flex min-w-0 flex-1 items-center gap-2 leading-snug font-medium">
                        <span className="min-w-0 break-words">{label}</span>
                        {showRequestsBadge && (
                          <span
                            className="inline-flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white tabular-nums"
                            style={{ backgroundColor: "var(--tlk-unread-badge)" }}
                          >
                            {requestsBadgeN > 99 ? "99+" : requestsBadgeN}
                          </span>
                        )}
                        {showPayoutsBadge && (
                          <span
                            className="inline-flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums ring-1"
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

              <div className="shrink-0 space-y-2 border-t pt-2 pb-1" style={{ borderColor: "var(--tlk-panel-border)" }}>
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="tlk-type-meta" style={{ color: "var(--tlk-text-secondary)" }}>
                    Тема
                  </span>
                  <AdminShellThemeToggle compact />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="tlk-type-body tlk-transition flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 font-medium"
                  style={{
                    borderColor: "var(--tlk-border)",
                    color: "var(--tlk-text)",
                    backgroundColor: "var(--tlk-nav-wrap-bg)",
                  }}
                >
                  <LogOut className="h-4 w-4 shrink-0" style={{ color: "var(--tlk-accent)" }} aria-hidden />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {lgSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsedPersisted(false)}
          className={expandBtnClass}
          style={{
            borderColor: "var(--tlk-panel-border)",
            backgroundColor: "var(--tlk-expand-fab-bg)",
            color: "var(--tlk-text)",
          }}
          aria-label="Показать боковое меню"
          title="Меню"
        >
          <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      <main className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden px-0 pt-2 pb-4 lg:px-4 lg:pt-3 lg:pb-8">
        <div className="relative z-10 flex min-h-0 w-full max-w-full flex-1 flex-col lg:z-0">
          {pathname !== "/admin/dashboard" && pathname !== "/admin" && (
            <PanelMobileBackButton variant="adminTlk" fallbackHref="/admin/dashboard" />
          )}
          <div
            className="test-lk-inner-main flex min-h-0 flex-1 flex-col overflow-x-hidden px-4 py-3 sm:px-6 md:py-6 lg:px-2 lg:py-2"
            id="main-content"
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShellThemeProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminShellThemeProvider>
  );
}
