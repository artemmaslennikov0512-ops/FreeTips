"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, LogOut, Menu, User } from "lucide-react";
import { PanelMobileBackButton } from "@/components/PanelMobileBackButton";
import {
  TEST_LK_NAV_EXTRA,
  buildTestLkNavSections,
  flattenTestLkNavSections,
  testLkIsNavActive,
} from "./test-lk-nav";
import { TestLkMockRouteProvider, useTestLkMockRoute } from "./TestLkMockRouteContext";
import { TestLkMockShellThemeProvider, useTestLkMockShellTheme } from "./TestLkMockShellThemeContext";
import { TestLkMockShellThemeToggle } from "./TestLkMockShellThemeToggle";
import "./test-lk-mock.css";

const TEST_LK_LG_SIDEBAR_KEY = "test-lk-lg-sidebar-collapsed";

function subscribeNoop(): () => void {
  return () => {};
}

function NavLinkRow({
  label,
  href,
  icon: Icon,
  iconClass,
  active,
  onNavigate,
  badge,
  inDevelopment,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
  iconClass: string;
  active: boolean;
  onNavigate?: () => void;
  badge?: number | null;
  inDevelopment?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`tlk-transition flex items-center gap-2 rounded-lg px-3 py-3 font-medium ${
        active
          ? "border font-semibold shadow-sm"
          : "border border-transparent text-[var(--tlk-text)]/80 hover:bg-[var(--tlk-sidebar-active-bg)] hover:text-[var(--tlk-text)]"
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
      <Icon className={`h-5 w-5 shrink-0 ${iconClass}`} aria-hidden />
      <span className="tlk-type-body min-w-0 flex-1 leading-snug font-medium">{label}</span>
      {inDevelopment ? (
        <span
          className="tlk-inset-surface tlk-type-nav-section shrink-0 rounded-md border border-solid px-1.5 py-0.5"
          style={{ color: "var(--tlk-text-secondary)" }}
        >
          в разработке
        </span>
      ) : null}
      {badge != null && badge > 0 ? (
        <span
          className="tlk-type-meta ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 font-semibold text-white"
          style={{ backgroundColor: "var(--tlk-unread-badge)" }}
          aria-label={`Непрочитанных: ${badge}`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { basePath } = useTestLkMockRoute();
  const { shellTheme } = useTestLkMockShellTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [lgSidebarCollapsed, setLgSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navSections = useMemo(() => buildTestLkNavSections(basePath), [basePath]);
  const flatNav = useMemo(() => flattenTestLkNavSections(navSections), [navSections]);

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

  const isActive = useCallback((href: string) => testLkIsNavActive(pathname, href), [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const panelStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--tlk-panel-bg)",
        borderColor: "var(--tlk-panel-border)",
      }) as const,
    [],
  );

  const supportBadge = 2;
  const supportHref = `${basePath}/support`;

  const collapseBtn =
    "relative z-30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--tlk-text)] shadow-none transition-[color,background-color,border-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
  const expandBtnClass =
    "fixed left-0 top-1/2 z-[35] hidden h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border shadow-none transition-[color,background-color,border-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--tlk-accent)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:flex";

  if (!mounted) {
    return (
      <div
        className="test-lk-mock-root flex min-h-screen items-center justify-center font-[family:var(--font-inter)]"
        data-tlk-theme={shellTheme}
      >
        <p className="tlk-type-body-muted">Загрузка макета…</p>
      </div>
    );
  }

  return (
    <div
      className="test-lk-mock-root flex min-h-screen w-full max-w-full overflow-x-hidden pt-3 font-[family:var(--font-inter)] lg:pt-5"
      data-tlk-theme={shellTheme}
      style={{ backgroundColor: "var(--tlk-shell-bg)", color: "var(--tlk-text)" }}
    >
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-out lg:mt-3 lg:flex lg:self-start ${
          lgSidebarCollapsed ? "lg:w-0 lg:pointer-events-none lg:overflow-hidden" : "lg:relative lg:z-10 lg:w-[260px] lg:overflow-hidden"
        }`}
      >
        <div className="relative flex h-full min-h-0 w-[260px] min-w-[260px] flex-col overflow-hidden border-r py-6 lg:static lg:max-h-[calc(100vh-2rem)] lg:pt-2" style={{ borderColor: "var(--tlk-panel-border)" }}>
          <div className="mx-4 border-b px-0 pb-4" style={{ borderColor: "var(--tlk-panel-border)" }}>
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "var(--tlk-accent)", color: "var(--tlk-expand-fab-bg)" }}
                aria-hidden
              >
                <User className="h-7 w-7" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="tlk-type-profile-name block truncate">Макет пользователя</span>
                <div className="tlk-type-profile-meta mt-0.5">Новый стиль · разделы как в /cabinet</div>
              </div>
            </div>
          </div>

          <div className="mb-2 mt-6 flex h-9 shrink-0 items-center px-4">
            <span className="w-9 shrink-0 select-none" aria-hidden />
            <span className="tlk-type-nav-heading min-w-0 flex-1 text-center">Навигация</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-end">
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

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4">
            <nav className="flex flex-col gap-3 py-2" aria-label="Навигация по тестовому кабинету">
              {navSections.map(({ title, items }) => (
                <div key={title ?? items[0]?.href ?? "nav"}>
                  {title ? <p className="tlk-type-nav-section mb-1 px-2">{title}</p> : null}
                  <div className="flex flex-col gap-0.5">
                    {items.map((item) => (
                      <NavLinkRow
                        key={item.href}
                        label={item.label}
                        href={item.href}
                        icon={item.icon}
                        iconClass={item.iconClass}
                        active={isActive(item.href)}
                        badge={item.href === supportHref ? supportBadge : undefined}
                        inDevelopment={item.inDevelopment}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t pt-2" style={{ borderColor: "var(--tlk-panel-border)" }}>
                <p className="tlk-type-nav-section mb-1 px-2">Вне макета</p>
                <NavLinkRow
                  label={TEST_LK_NAV_EXTRA.label}
                  href={TEST_LK_NAV_EXTRA.href}
                  icon={TEST_LK_NAV_EXTRA.icon}
                  iconClass={TEST_LK_NAV_EXTRA.iconClass}
                  active={false}
                />
                <p className="tlk-type-meta mt-1 px-2 leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
                  Боевой раздел, нужен вход
                </p>
              </div>
            </nav>

            <div className="mt-4 flex items-center justify-between gap-2 px-1">
              <span className="tlk-type-meta" style={{ color: "var(--tlk-text-secondary)" }}>
                Тема макета
              </span>
              <TestLkMockShellThemeToggle compact />
            </div>

            <button
              type="button"
              className="tlk-type-body tlk-transition mt-3 flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 font-medium"
              style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-nav-wrap-bg)" }}
            >
              <LogOut className="h-4 w-4 shrink-0" style={{ color: "var(--tlk-accent)" }} aria-hidden />
              <span>Выход (макет)</span>
            </button>
          </div>
        </div>
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
          <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 lg:hidden" style={{ borderColor: "var(--tlk-panel-border)" }}>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="tlk-transition flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-nav-wrap-bg)" }}
              aria-label="Открыть меню"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
            </button>
            <span className="tlk-type-section-title min-w-0 flex-1 truncate text-center" style={{ color: "var(--tlk-text)" }}>
              Тестовый ЛК
            </span>
            <div className="shrink-0">
              <TestLkMockShellThemeToggle compact />
            </div>
          </div>

          {pathname !== basePath && pathname !== `${basePath}/` ? (
            <PanelMobileBackButton variant="testLkMock" fallbackHref={basePath} />
          ) : null}

          <div className="test-lk-inner-main flex min-h-0 flex-1 flex-col overflow-x-hidden px-4 py-3 sm:px-6 md:py-6 lg:px-2 lg:py-2">
            {children}
          </div>
        </div>
      </main>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] lg:hidden"
            style={{ backgroundColor: "var(--tlk-mobile-scrim)" }}
            aria-label="Закрыть меню"
            onClick={closeMobile}
          />
          <div
            className="fixed left-0 top-0 z-[56] flex h-full w-[min(88vw,300px)] flex-col overflow-y-auto border-r py-6 shadow-2xl backdrop-blur-xl lg:hidden"
            style={{ ...panelStyle, borderColor: "var(--tlk-panel-border)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Меню"
          >
            <div
              className="mx-4 rounded-[10px] border px-4 py-3"
              style={{ borderColor: "var(--tlk-profile-border)", backgroundColor: "var(--tlk-profile-bg)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: "var(--tlk-accent)", color: "var(--tlk-expand-fab-bg)" }}
                  aria-hidden
                >
                  <User className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="tlk-type-profile-name truncate">Макет пользователя</div>
                  <div className="tlk-type-profile-meta mt-0.5">Превью · без входа</div>
                </div>
              </div>
            </div>
            <nav className="mt-4 flex flex-col gap-0.5 px-3" aria-label="Разделы">
              {flatNav.map((item) => (
                <NavLinkRow
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  iconClass={item.iconClass}
                  active={isActive(item.href)}
                  onNavigate={closeMobile}
                  badge={item.href === supportHref ? supportBadge : undefined}
                  inDevelopment={item.inDevelopment}
                />
              ))}
              <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--tlk-panel-border)" }}>
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
            <div className="mt-auto border-t px-4 pt-4" style={{ borderColor: "var(--tlk-panel-border)" }}>
              <div className="flex items-center justify-between">
                <span className="tlk-type-meta" style={{ color: "var(--tlk-text-secondary)" }}>
                  Тема макета
                </span>
                <TestLkMockShellThemeToggle compact />
              </div>
              <Link
                href="/test-preview"
                onClick={closeMobile}
                className="tlk-type-body mt-3 block text-center font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--tlk-primary)" }}
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

function Shell({ children }: { children: ReactNode }) {
  return <ShellInner>{children}</ShellInner>;
}

export function TestLkMockLayoutClient({ children }: { children: ReactNode }) {
  return (
    <TestLkMockRouteProvider>
      <TestLkMockShellThemeProvider>
        <Shell>{children}</Shell>
      </TestLkMockShellThemeProvider>
    </TestLkMockRouteProvider>
  );
}
