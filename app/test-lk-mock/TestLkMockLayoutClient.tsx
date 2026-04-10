"use client";

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Search,
  Sun,
  Monitor,
} from "lucide-react";
import {
  TEST_LK_BASE,
  TEST_LK_NAV,
  TEST_LK_NAV_CABINET_LIKE,
  TEST_LK_NAV_DASHBOARD,
  TEST_LK_NAV_EXTRA,
  TEST_LK_NAV_HALL_MOCK,
  testLkIsNavActive,
} from "./test-lk-nav";
import { TestLkMockThemeProvider, useTestLkMockTheme, type ThemeChoice } from "./TestLkMockThemeContext";
import "./test-lk-mock.css";

const ExtraNavIcon = TEST_LK_NAV_EXTRA.icon;

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const { themeChoice, setThemeChoice, effective } = useTestLkMockTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const setTheme = useCallback(
    (t: ThemeChoice) => {
      setThemeChoice(t);
      setThemeMenuOpen(false);
    },
    [setThemeChoice],
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const scopeStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--tlk-bg-app)",
        color: "var(--tlk-text)",
        minHeight: "100vh",
      }) satisfies CSSProperties,
    [],
  );

  const navLinkStyle = (active: boolean, collapsed: boolean): CSSProperties => ({
    paddingLeft: collapsed ? 0 : 12,
    paddingRight: collapsed ? 0 : 12,
    justifyContent: collapsed ? "center" : "flex-start",
    backgroundColor: active ? "var(--tlk-sidebar-active-bg)" : "transparent",
    color: "var(--tlk-text)",
    boxShadow: active ? "inset 3px 0 0 0 var(--tlk-primary)" : "none",
  });

  return (
    <div className="test-lk-mock-scope tlk-transition" data-tlk-theme={effective} style={scopeStyle}>
      <header
        className="tlk-transition flex h-14 shrink-0 items-center border-b px-4 md:px-6"
        style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
      >
        <Link
          href={TEST_LK_BASE}
          className="flex items-center gap-2 text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md"
          style={{ ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--tlk-card-deep), var(--tlk-card-mid))" }}
          >
            D
          </span>
          <span className="hidden flex-col sm:flex">
            <span className="font-semibold leading-tight" style={{ color: "var(--tlk-text)" }}>
              Тестовый ЛК
            </span>
            <span className="text-[10px] font-normal leading-none" style={{ color: "var(--tlk-text-secondary)" }}>
              макет · как в /cabinet
            </span>
          </span>
        </Link>

        <div className="mx-4 hidden max-w-md flex-1 md:flex">
          <label className="relative w-full">
            <span className="sr-only">Поиск по разделам</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--tlk-text-secondary)" }} />
            <input
              type="search"
              placeholder="Поиск…"
              readOnly
              className="tlk-transition w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={
                {
                  borderColor: "var(--tlk-border)",
                  backgroundColor: "var(--tlk-bg-app)",
                  color: "var(--tlk-text)",
                  ["--tw-ring-color" as string]: "var(--tlk-focus)",
                } as CSSProperties
              }
            />
          </label>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="tlk-transition flex h-10 w-10 items-center justify-center rounded-xl border outline-none focus-visible:ring-2"
            style={
              {
                borderColor: "var(--tlk-border)",
                backgroundColor: "var(--tlk-surface)",
                color: "var(--tlk-text-secondary)",
                ["--tw-ring-color" as string]: "var(--tlk-focus)",
              } as CSSProperties
            }
            aria-label="Уведомления"
          >
            <Bell className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setThemeMenuOpen(false);
              }}
              className="tlk-transition flex items-center gap-2 rounded-xl border px-2 py-1.5 outline-none focus-visible:ring-2 sm:px-3"
              style={
                {
                  borderColor: "var(--tlk-border)",
                  backgroundColor: "var(--tlk-surface)",
                  ["--tw-ring-color" as string]: "var(--tlk-focus)",
                } as CSSProperties
              }
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--tlk-primary)" }}
              >
                МК
              </span>
              <span className="hidden text-left text-sm font-medium lg:block" style={{ color: "var(--tlk-text)" }}>
                Макет пользователя
              </span>
              <ChevronDown className="hidden h-4 w-4 lg:block" style={{ color: "var(--tlk-text-secondary)" }} />
            </button>

            {profileOpen ? (
              <div
                className="absolute right-0 z-50 mt-2 w-56 rounded-xl border py-1 shadow-lg"
                style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
                role="menu"
              >
                <div className="border-b px-3 py-2 text-xs" style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text-secondary)" }}>
                  Внешний вид
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:opacity-90"
                  style={{ color: "var(--tlk-text)" }}
                  onClick={() => setThemeMenuOpen((v) => !v)}
                >
                  <Monitor className="h-4 w-4" />
                  Тема: {themeChoice === "system" ? "Как в системе" : themeChoice === "dark" ? "Тёмная" : "Светлая"}
                </button>
                {themeMenuOpen ? (
                  <div className="border-t px-2 py-1" style={{ borderColor: "var(--tlk-border)" }}>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm" style={{ color: "var(--tlk-text)" }} onClick={() => setTheme("light")}>
                      <Sun className="h-4 w-4" /> Светлая
                    </button>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm" style={{ color: "var(--tlk-text)" }} onClick={() => setTheme("dark")}>
                      <Moon className="h-4 w-4" /> Тёмная
                    </button>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm" style={{ color: "var(--tlk-text)" }} onClick={() => setTheme("system")}>
                      <Monitor className="h-4 w-4" /> Как в системе
                    </button>
                  </div>
                ) : null}
                <div className="my-1 border-t" style={{ borderColor: "var(--tlk-border)" }} />
                <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm no-underline hover:opacity-90" style={{ color: "var(--tlk-text)" }}>
                  На сайт
                </Link>
                <Link href="/cabinet" className="flex items-center gap-2 px-3 py-2 text-sm no-underline hover:opacity-90" style={{ color: "var(--tlk-text)" }}>
                  Боевой /cabinet
                </Link>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
                  <LogOut className="h-4 w-4" />
                  Выход (макет)
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="tlk-transition flex h-10 w-10 items-center justify-center rounded-xl border md:hidden"
            style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)" }}
            aria-label="Открыть меню"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] min-w-0">
        <aside
          className="tlk-transition hidden shrink-0 border-r md:flex md:flex-col"
          style={{
            width: sidebarCollapsed ? 72 : 240,
            borderColor: "var(--tlk-border)",
            backgroundColor: "var(--tlk-surface)",
          }}
        >
          <div className="flex items-center justify-between border-b p-2" style={{ borderColor: "var(--tlk-border)" }}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="tlk-transition flex h-9 w-full items-center justify-center rounded-lg outline-none focus-visible:ring-2"
              style={{ color: "var(--tlk-text-secondary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
              aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2" aria-label="Навигация тестового ЛК">
            {!sidebarCollapsed ? (
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                Навигация
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <ul className="space-y-0.5">
                {(() => {
                  const { label, href, icon: Icon } = TEST_LK_NAV_DASHBOARD;
                  const active = testLkIsNavActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className="tlk-transition flex items-center gap-3 rounded-lg py-2 text-left text-sm outline-none focus-visible:ring-2"
                        style={{ ...navLinkStyle(active, sidebarCollapsed), ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} aria-hidden />
                        {!sidebarCollapsed ? <span className="truncate">{label}</span> : null}
                      </Link>
                    </li>
                  );
                })()}
              </ul>
              {!sidebarCollapsed ? (
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                  Сценарий зала (макет)
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {TEST_LK_NAV_HALL_MOCK.map(({ label, href, icon: Icon }) => {
                  const active = testLkIsNavActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className="tlk-transition flex items-center gap-3 rounded-lg py-2 text-left text-sm outline-none focus-visible:ring-2"
                        style={{ ...navLinkStyle(active, sidebarCollapsed), ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} aria-hidden />
                        {!sidebarCollapsed ? <span className="truncate">{label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {!sidebarCollapsed ? (
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                  Как в /cabinet
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {TEST_LK_NAV_CABINET_LIKE.map(({ label, href, icon: Icon }) => {
                  const active = testLkIsNavActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className="tlk-transition flex items-center gap-3 rounded-lg py-2 text-left text-sm outline-none focus-visible:ring-2"
                        style={{ ...navLinkStyle(active, sidebarCollapsed), ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                        title={sidebarCollapsed ? label : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} aria-hidden />
                        {!sidebarCollapsed ? (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate">{label}</span>
                            {href === `${TEST_LK_BASE}/support` ? (
                              <span
                                className="ml-auto flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
                                style={{ backgroundColor: "var(--tlk-danger)" }}
                              >
                                2
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            {!sidebarCollapsed ? (
              <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--tlk-border)" }}>
                <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                  Вне макета
                </div>
                <Link
                  href={TEST_LK_NAV_EXTRA.href}
                  className="tlk-transition flex items-center gap-3 rounded-lg py-2 pl-3 pr-2 text-sm no-underline outline-none focus-visible:ring-2"
                  style={{ color: "var(--tlk-text)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                >
                  <ExtraNavIcon className="h-5 w-5 shrink-0" style={{ color: "var(--tlk-text-secondary)" }} aria-hidden />
                  <span className="truncate">{TEST_LK_NAV_EXTRA.label}</span>
                </Link>
                <p className="mt-1 px-2 text-[10px] leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
                  Боевой раздел, нужен вход
                </p>
              </div>
            ) : (
              <div className="mt-2 flex justify-center border-t pt-2" style={{ borderColor: "var(--tlk-border)" }}>
                <Link
                  href={TEST_LK_NAV_EXTRA.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg outline-none focus-visible:ring-2"
                  style={{ ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                  title={TEST_LK_NAV_EXTRA.label}
                >
                  <ExtraNavIcon className="h-5 w-5" style={{ color: "var(--tlk-text-secondary)" }} aria-hidden />
                </Link>
              </div>
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>

      {mobileOpen ? (
        <>
          <button type="button" className="fixed inset-0 z-[55] bg-black/40 md:hidden" aria-label="Закрыть меню" onClick={closeMobile} />
          <nav
            className="fixed left-0 top-14 z-[56] flex h-[calc(100dvh-3.5rem)] w-[min(85vw,280px)] flex-col overflow-y-auto border-r p-2 md:hidden"
            style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
            aria-label="Разделы"
          >
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
              Навигация
            </div>
            <ul className="space-y-0.5">
              {TEST_LK_NAV.map(({ label, href, icon: Icon }) => {
                const active = testLkIsNavActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={closeMobile}
                      className="tlk-transition flex items-center gap-3 rounded-lg py-2 pl-3 pr-2 text-sm no-underline outline-none focus-visible:ring-2"
                      style={
                        {
                          backgroundColor: active ? "var(--tlk-sidebar-active-bg)" : "transparent",
                          color: "var(--tlk-text)",
                          boxShadow: active ? "inset 3px 0 0 0 var(--tlk-primary)" : "none",
                          ["--tw-ring-color" as string]: "var(--tlk-focus)",
                        } as CSSProperties
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} aria-hidden />
                      <span className="flex flex-1 items-center gap-2">
                        <span>{label}</span>
                        {href === `${TEST_LK_BASE}/support` ? (
                          <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: "var(--tlk-danger)" }}>
                            2
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--tlk-border)" }}>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                Вне макета
              </div>
              <Link
                href={TEST_LK_NAV_EXTRA.href}
                onClick={closeMobile}
                className="flex items-center gap-3 rounded-lg py-2 pl-3 pr-2 text-sm no-underline"
                style={{ color: "var(--tlk-text)" }}
              >
                <ExtraNavIcon className="h-5 w-5 shrink-0" aria-hidden />
                {TEST_LK_NAV_EXTRA.label}
              </Link>
            </div>
          </nav>
        </>
      ) : null}

      {profileOpen ? (
        <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" aria-label="Закрыть меню" onClick={() => setProfileOpen(false)} />
      ) : null}
    </div>
  );
}

export function TestLkMockLayoutClient({ children }: { children: ReactNode }) {
  return (
    <TestLkMockThemeProvider>
      <Shell>{children}</Shell>
    </TestLkMockThemeProvider>
  );
}
