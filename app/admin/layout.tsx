"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  LogOut,
  LayoutDashboard,
  Send,
  Users,
  Menu,
  ShieldCheck,
  MessageCircle,
  Building2,
  FileCheck,
  CreditCard,
  KeyRound,
} from "lucide-react";
import { getAccessToken, fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ADMIN_REQUESTS_COUNTS_CHANGED } from "@/lib/admin-requests-counts-sync";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";

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
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  /** Сумма pending по верификации и подключению — бейдж у пункта «Заявки». */
  const [requestsPendingTotal, setRequestsPendingTotal] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

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
      const data = (await res.json()) as { totalPending?: number };
      setRequestsPendingTotal(typeof data.totalPending === "number" ? data.totalPending : 0);
    } catch {
      setRequestsPendingTotal(null);
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

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
    <div className="admin-panel cabinet-premium flex min-h-screen w-full min-w-0 max-w-full bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-0 lg:pt-4">
      {/* Шторка — закрывает выпадающее меню при клике вне (мобильный) */}
      <div
        className={`admin-overlay cabinet-overlay fixed inset-0 z-30 border-0 bg-[rgba(15,23,42,0.65)] backdrop-blur-xl transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />

      {/* Боковая панель — только на десктопе (lg+); на мобильном навигация в выпадающем списке под кнопкой */}
      <aside
        className="admin-sidebar cabinet-sidebar hidden lg:flex fixed left-4 top-4 z-40 h-auto max-h-[calc(100vh-2rem)] w-[260px] shrink-0 flex-col overflow-hidden rounded-[10px] border border-white/10 bg-[var(--color-navy)] py-6 shadow-sm backdrop-blur-xl lg:static lg:left-auto lg:top-auto lg:ml-0 lg:mt-4 lg:mr-0 lg:mb-0 lg:max-h-none lg:self-start lg:translate-x-0"
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="cabinet-sidebar-profile cabinet-block-inner mx-4 mb-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-3">
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
          <div className="cabinet-nav-block flex-1 overflow-y-auto px-4 py-2">
            <p className="cabinet-nav-label mb-2 px-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50">
              Навигация
            </p>
            <nav className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-white/5 p-1.5 shadow-[var(--shadow-subtle)]" aria-label="Навигация админ-панели">
              {NAV.map(({ label, href, icon: Icon, iconClass }) => {
                const showRequestsBadge =
                  href === "/admin/verification-requests" && requestsPendingTotal != null && requestsPendingTotal > 0;
                const badgeN = requestsPendingTotal ?? 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium transition-colors ${
                      isActive(href)
                        ? "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-semibold"
                        : "border border-transparent text-white/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
                    <span className="flex min-w-0 flex-1 items-center gap-2 break-words">
                      {label}
                      {showRequestsBadge && (
                        <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-[11px] font-bold leading-none text-white tabular-nums">
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
              onClick={handleLogout}
              className={`mt-4 ${ADMIN_BTN} w-full !justify-center gap-3 px-4 py-3 text-sm`}
            >
              <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-1 lg:pt-0 lg:pl-0 lg:pr-0 lg:ml-0 flex flex-col">
        {/* Меню вне .admin-main-block (как в ЛК официанта): transform/scale у выпадашки не должен влиять на ширину основной карточки */}
        <div className="app-panel-mobile-nav relative z-[50] mb-2 shrink-0 px-4 sm:px-6 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className={`cabinet-menu-btn ${ADMIN_BTN} relative flex h-14 min-h-14 w-14 min-w-14 shrink-0 items-center justify-center !gap-0 !p-0 active:scale-95`}
            aria-label="Меню"
            aria-expanded={sidebarOpen}
            aria-haspopup="true"
            aria-controls="admin-nav-dropdown"
          >
            <Menu className="h-6 w-6 shrink-0 pointer-events-none" strokeWidth={2} aria-hidden />
          </button>
          <div
            id="admin-nav-dropdown"
            role="menu"
            className={`cabinet-nav-dropdown admin-nav-dropdown absolute left-0 top-full z-50 mt-2 max-h-[min(70vh,calc(100dvh-8rem))] w-[min(100vw-2rem,20rem)] origin-top overflow-y-auto rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-navy)] shadow-[var(--shadow-card)] backdrop-blur-xl transition-opacity duration-200 ${
              sidebarOpen ? "opacity-100" : "pointer-events-none invisible opacity-0"
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
                onClick={() => { closeSidebar(); handleLogout(); }}
                className={`mt-3 ${ADMIN_BTN} w-full !justify-center gap-2.5 px-2.5 py-2.5 text-sm`}
                role="menuitem"
              >
                <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </div>
        <div className="admin-main-block cabinet-main-block app-panel-main-surface mt-0 mr-0 mb-4 ml-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col rounded-lg border border-white/10 bg-white/[0.06] backdrop-blur-xl lg:mt-4 lg:mr-0 lg:ml-4 lg:min-h-[calc(100vh-2rem)] lg:rounded-[10px]">
          <div className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden flex flex-col px-4 py-3 sm:px-6 sm:py-4 lg:p-8" id="main-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
