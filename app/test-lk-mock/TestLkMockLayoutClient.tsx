"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Menu, User } from "lucide-react";
import { CABINET_WAITER_BTN } from "@/lib/cabinet-button-classes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import {
  TEST_LK_BASE,
  TEST_LK_NAV,
  TEST_LK_NAV_EXTRA,
  TEST_LK_NAV_SECTIONS,
  testLkIsNavActive,
} from "./test-lk-nav";
import "./test-lk-mock.css";
import "./test-lk-cabinet-v2.css";

const TEST_LK_LG_SIDEBAR_KEY = "test-lk-lg-sidebar-collapsed";

const LG_SIDEBAR_COLLAPSE_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--collapse relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[var(--color-text)] shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/35 hover:bg-white/[0.14] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const LG_SIDEBAR_EXPAND_BTN =
  "cabinet-lg-sidebar-toggle cabinet-lg-sidebar-toggle--expand fixed left-0 top-1/2 z-[35] hidden h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-white/20 bg-[var(--color-navy)] text-[var(--color-text)] shadow-none transition-[color,background-color,border-color] duration-200 hover:border-white/35 hover:bg-white/[0.08] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:flex";

function NavLinkRow({
  label,
  href,
  icon: Icon,
  iconClass,
  active,
  onNavigate,
  badge,
}: {
  label: string;
  href: string;
  icon: (typeof TEST_LK_NAV)[0]["icon"];
  iconClass: string;
  active: boolean;
  onNavigate?: () => void;
  badge?: number | null;
}) {
  const navActiveClasses =
    "cabinet-nav-active border border-[var(--color-brand-gold)]/35 bg-[var(--color-brand-gold)]/12 text-[var(--color-text)] font-semibold";
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium transition-colors ${
        active
          ? navActiveClasses
          : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
      <span>{label}</span>
      {badge != null && badge > 0 ? (
        <span
          className="cabinet-support-unread-badge ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--color-accent-red)] px-1.5 text-xs font-semibold text-white"
          aria-label={`Непрочитанных: ${badge}`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function subscribeNoop(): () => void {
  return () => {};
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [lgSidebarCollapsed, setLgSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("cabinet-page");
    return () => document.body.classList.remove("cabinet-page");
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(TEST_LK_LG_SIDEBAR_KEY) === "1") {
        queueMicrotask(() => setLgSidebarCollapsed(true));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setSidebarCollapsedPersisted = useCallback((collapsed: boolean) => {
    setLgSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(TEST_LK_LG_SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const isActive = useCallback(
    (href: string) => testLkIsNavActive(pathname, href),
    [pathname],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const sidebarStyle = useMemo(
    () => ({ backgroundColor: "rgba(255,255,255,0.06)" as const }),
    [],
  );

  const mainBlockStyle = useMemo(
    () => ({ backgroundColor: "rgba(255,255,255,0.06)" as const }),
    [],
  );

  const supportBadge = 2;

  if (!mounted) {
    return (
      <div className="cabinet-premium test-lk-as-cabinet flex min-h-screen items-center justify-center bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)]">
        <p className="text-sm text-[var(--color-text-secondary)]">Загрузка макета…</p>
      </div>
    );
  }

  return (
    <div className="cabinet-premium test-lk-as-cabinet flex min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--color-bg)] pt-3 font-[family:var(--font-inter)] text-[var(--color-text)] lg:pt-5">
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:mt-3 lg:flex lg:self-start ${
          lgSidebarCollapsed ? "lg:w-0 lg:pointer-events-none lg:overflow-hidden" : "lg:relative lg:z-10 lg:w-[260px] lg:overflow-hidden"
        }`}
      >
        <div
          className="cabinet-sidebar relative flex h-full min-h-0 w-[260px] min-w-[260px] flex-col overflow-hidden border-0 border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl lg:static lg:max-h-[calc(100vh-2rem)] lg:rounded-[10px] lg:border-x lg:border-b lg:border-t-0 lg:border-white/10"
          style={sidebarStyle}
        >
          <div className="cabinet-sidebar-profile cabinet-block-inner mx-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="cabinet-sidebar-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]"
                aria-hidden
              >
                <User className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="truncate font-semibold text-[var(--color-text)]">Макет пользователя</span>
                <div className="text-sm text-[var(--color-text)]/80">Получатель · превью</div>
              </div>
            </div>
          </div>

          <div className="mb-2 mt-6 flex h-9 shrink-0 items-center px-4">
            <span className="w-9 shrink-0 select-none" aria-hidden />
            <span className="cabinet-nav-label min-w-0 flex-1 text-center text-xs font-semibold uppercase leading-none tracking-wider text-[var(--color-text)]/50">
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
                <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>

          <div className="cabinet-nav-block flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4">
            <nav
              className="flex flex-col gap-3 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1.5 shadow-[var(--shadow-subtle)]"
              aria-label="Навигация по тестовому кабинету"
            >
              {TEST_LK_NAV_SECTIONS.map(({ title, items }) => (
                <div key={title ?? items[0]?.href ?? "nav"}>
                  {title ? (
                    <p className="cabinet-nav-label mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text)]/45">{title}</p>
                  ) : null}
                  <div className="flex flex-col gap-0.5">
                    {items.map((item) => (
                      <NavLinkRow
                        key={item.href}
                        {...item}
                        active={isActive(item.href)}
                        badge={item.href === `${TEST_LK_BASE}/support` ? supportBadge : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-2">
                <p className="cabinet-nav-label mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text)]/45">Вне макета</p>
                <NavLinkRow
                  label={TEST_LK_NAV_EXTRA.label}
                  href={TEST_LK_NAV_EXTRA.href}
                  icon={TEST_LK_NAV_EXTRA.icon}
                  iconClass={TEST_LK_NAV_EXTRA.iconClass}
                  active={false}
                />
                <p className="mt-1 px-2 text-[10px] leading-snug text-[var(--color-text)]/55">Боевой раздел, нужен вход</p>
              </div>
            </nav>

            <div className="mt-4 flex items-center justify-between gap-2 px-1">
              <span className="text-xs text-[var(--color-text-secondary)]">Тема</span>
              <ThemeToggle />
            </div>

            <button type="button" className={`mt-3 flex ${CABINET_WAITER_BTN} w-full !justify-center gap-3 px-4 py-3 text-sm`}>
              <LogOut className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
              <span>Выход (макет)</span>
            </button>
          </div>
        </div>
      </div>

      {lgSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setSidebarCollapsedPersisted(false)}
          className={LG_SIDEBAR_EXPAND_BTN}
          aria-label="Показать боковое меню"
          title="Меню"
        >
          <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      <main className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden px-0 pt-2 pb-4 lg:ml-0 lg:mr-0 lg:px-0 lg:pr-4 lg:pt-3">
        <div
          className="cabinet-main-block app-panel-main-surface relative z-10 mb-4 ml-0 mr-0 mt-0 flex min-h-0 w-full max-w-full flex-1 flex-col rounded-lg border-x border-b border-white/10 backdrop-blur-xl md:rounded-[10px] lg:z-0 lg:mr-4 lg:ml-4"
          style={mainBlockStyle}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={`${CABINET_WAITER_BTN} flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center !gap-0 !p-0`}
              aria-label="Открыть меню"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            </button>
            <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--color-text)]">Тестовый ЛК</span>
            <div className="shrink-0 scale-90">
              <ThemeToggle />
            </div>
          </div>

          {pathname !== TEST_LK_BASE && pathname !== `${TEST_LK_BASE}/` ? (
            <PanelMobileBackButton variant="cabinet" fallbackHref={TEST_LK_BASE} />
          ) : null}

          <div className="test-lk-inner-main flex min-h-0 flex-1 flex-col overflow-x-hidden px-4 py-3 sm:px-6 md:py-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>

      {mobileOpen ? (
        <>
          <button type="button" className="fixed inset-0 z-[55] bg-black/50 lg:hidden" aria-label="Закрыть меню" onClick={closeMobile} />
          <div
            className="cabinet-mobile-nav-dialog fixed left-0 top-0 z-[56] flex h-full w-[min(88vw,300px)] flex-col overflow-y-auto border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl lg:hidden"
            style={sidebarStyle}
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <div className="cabinet-sidebar-profile cabinet-block-inner mx-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="cabinet-sidebar-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]" aria-hidden>
                  <User className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--color-text)]">Макет пользователя</div>
                  <div className="text-xs text-[var(--color-text)]/80">Превью · как /cabinet</div>
                </div>
              </div>
            </div>
            <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label="Разделы">
              {TEST_LK_NAV.map((item) => (
                <NavLinkRow
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  onNavigate={closeMobile}
                  badge={item.href === `${TEST_LK_BASE}/support` ? supportBadge : undefined}
                />
              ))}
              <div className="mt-3 border-t border-white/10 pt-3">
                <NavLinkRow
                  label={TEST_LK_NAV_EXTRA.label}
                  href={TEST_LK_NAV_EXTRA.href}
                  icon={TEST_LK_NAV_EXTRA.icon}
                  iconClass={TEST_LK_NAV_EXTRA.iconClass}
                  active={false}
                  onNavigate={closeMobile}
                />
              </div>
            </nav>
            <div className="mt-auto border-t border-white/10 px-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">Тема</span>
                <ThemeToggle />
              </div>
              <Link
                href="/test-preview"
                onClick={closeMobile}
                className="mt-3 block text-center text-sm font-medium text-[var(--color-brand-gold)] underline-offset-2 hover:underline"
              >
                Хаб превью
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function TestLkMockLayoutClient({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
