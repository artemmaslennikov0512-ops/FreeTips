"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Search,
  Settings,
  Sun,
  Monitor,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import "./test-lk-mock.css";

type ThemeChoice = "light" | "dark" | "system";

const NAV_GROUPS: { label: string; items: { id: string; icon: typeof LayoutDashboard; label: string }[] }[] = [
  {
    label: "Работа",
    items: [
      { id: "overview", icon: LayoutDashboard, label: "Обзор" },
      { id: "bookings", icon: Calendar, label: "Брони" },
      { id: "floor", icon: UtensilsCrossed, label: "Зал / смена" },
    ],
  },
  {
    label: "Ещё",
    items: [
      { id: "guests", icon: Users, label: "Гости" },
      { id: "settings", icon: Settings, label: "Настройки" },
    ],
  },
  {
    label: "Настройки",
    items: [{ id: "appearance", icon: Monitor, label: "Внешний вид" }],
  },
];

const KPI = [
  { title: "Выручка за 7 дней", value: "842 600 ₽", delta: "+12%", up: true },
  { title: "Средний чек", value: "1 840 ₽", delta: "+3%", up: true },
  { title: "Брони сегодня", value: "24", delta: "−2 к вчера", up: false },
  { title: "No-show за 7 дн.", value: "3", delta: "цель ≤ 5", up: true },
];

const BOOKINGS = [
  { time: "19:00", zone: "Веранда", guests: 4, name: "Иванова А.", phone: "+7 ··· 42-11", status: "Подтверждено", src: "Сайт" },
  { time: "19:30", zone: "Зал", guests: 2, name: "Петров П.", phone: "+7 ··· 88-90", status: "Новая", src: "Телефон" },
  { time: "20:00", zone: "Бар", guests: 3, name: "Сидорова Е.", phone: "+7 ··· 15-33", status: "Подтверждено", src: "Сайт" },
];

function useEffectiveTheme(choice: ThemeChoice): "light" | "dark" {
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  if (choice === "system") return systemDark ? "dark" : "light";
  return choice;
}

export function TestLkMockClient() {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>("system");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState("overview");
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const effective = useEffectiveTheme(themeChoice);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeChoice(t);
    setThemeMenuOpen(false);
  }, []);

  const handleNav = useCallback((id: string) => {
    setActiveNav(id);
    setMobileOpen(false);
    if (id === "appearance") {
      setProfileOpen(true);
      setThemeMenuOpen(true);
    }
  }, []);

  const scopeStyle = useMemo(
    () =>
      ({
        backgroundColor: "var(--tlk-bg-app)",
        color: "var(--tlk-text)",
        minHeight: "100vh",
      }) satisfies CSSProperties,
    [],
  );

  return (
    <div className="test-lk-mock-scope tlk-transition" data-tlk-theme={effective} style={scopeStyle}>
      <header
        className="tlk-transition flex h-14 shrink-0 items-center border-b px-4 md:px-6"
        style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
      >
        <Link
          href="/test-lk-mock"
          className="flex items-center gap-2 text-inherit no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-md"
          style={
            {
              ["--tw-ring-color" as string]: "var(--tlk-focus)",
            } as CSSProperties
          }
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, var(--tlk-card-deep), var(--tlk-card-mid))" }}
          >
            D
          </span>
          <span className="hidden font-semibold sm:inline" style={{ color: "var(--tlk-text)" }}>
            Demo ЛК
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
                ОР
              </span>
              <span className="hidden text-left text-sm font-medium lg:block" style={{ color: "var(--tlk-text)" }}>
                Олег Ресторатор
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
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm" style={{ color: "var(--tlk-danger)" }}>
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
              style={
                {
                  color: "var(--tlk-text-secondary)",
                  ["--tw-ring-color" as string]: "var(--tlk-focus)",
                } as CSSProperties
              }
              aria-label={sidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
            >
              {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                {!sidebarCollapsed ? (
                  <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                    {group.label}
                  </div>
                ) : null}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleNav(item.id)}
                          className="tlk-transition flex w-full items-center gap-3 rounded-lg py-2 text-left text-sm outline-none focus-visible:ring-2"
                          style={
                            {
                              paddingLeft: sidebarCollapsed ? 0 : 12,
                              paddingRight: sidebarCollapsed ? 0 : 12,
                              justifyContent: sidebarCollapsed ? "center" : "flex-start",
                              backgroundColor: active ? "var(--tlk-sidebar-active-bg)" : "transparent",
                              color: "var(--tlk-text)",
                              boxShadow: active ? "inset 3px 0 0 0 var(--tlk-primary)" : "none",
                              ["--tw-ring-color" as string]: "var(--tlk-focus)",
                            } as CSSProperties
                          }
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} />
                          {!sidebarCollapsed ? <span>{item.label}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
          <div className="mx-auto max-w-[1280px]">
            <nav className="mb-4 flex items-center gap-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }} aria-label="Хлебные крошки">
              <span>ЛК</span>
              <span aria-hidden>/</span>
              <span style={{ color: "var(--tlk-text)" }}>Обзор</span>
            </nav>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight md:text-[1.5rem] md:leading-8" style={{ color: "var(--tlk-text)" }}>
                  Добрый вечер, Олег
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
                  Пятница, 10 апреля · смена до 23:00
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="tlk-transition rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
                >
                  Экспорт броней
                </button>
                <button
                  type="button"
                  className="tlk-transition rounded-xl border px-4 py-2.5 text-sm font-medium outline-none focus-visible:ring-2"
                  style={
                    {
                      borderColor: "var(--tlk-border)",
                      backgroundColor: "var(--tlk-surface)",
                      color: "var(--tlk-text)",
                      ["--tw-ring-color" as string]: "var(--tlk-focus)",
                    } as CSSProperties
                  }
                >
                  Новая бронь
                </button>
              </div>
            </div>

            {/* Виртуальная карта */}
            <div className="mb-8 max-w-md">
              <div
                className="tlk-transition relative overflow-hidden rounded-2xl p-5 text-white shadow-none ring-1"
                style={{
                  minHeight: 200,
                  background: `linear-gradient(145deg, var(--tlk-card-deep) 0%, var(--tlk-card-mid) 55%, #0d281f 100%)`,
                  boxShadow: effective === "dark" ? "inset 0 0 0 1px rgba(255,255,255,0.08)" : "0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    background: "linear-gradient(115deg, transparent 40%, var(--tlk-card-glass) 50%, transparent 60%)",
                  }}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/80">Виртуальная карта</p>
                    <p className="mt-1 text-sm text-white/70">Доступно</p>
                    <p className="tlk-tabular mt-1 text-3xl font-semibold tracking-tight">124 580 ₽</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="h-6 w-8 rounded-md bg-white/85 shadow-sm" aria-hidden />
                    <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Mir</span>
                  </div>
                </div>
                <p className="tlk-tabular relative mt-6 text-lg tracking-[0.2em] text-white/95">•••• •••• •••• 4821</p>
                <div className="relative mt-5 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-white/30">
                    Пополнить
                  </button>
                  <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                    Операции
                  </button>
                  <button type="button" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                    Лимиты
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--tlk-text-secondary)" }}>
                Макет: без реальных платежей и номеров. Состояния «загрузка / нет карты» можно добавить отдельно.
              </p>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {KPI.map((k) => (
                <div
                  key={k.title}
                  className="tlk-transition rounded-xl border p-5"
                  style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
                >
                  <p className="text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
                    {k.title}
                  </p>
                  <p className="tlk-tabular mt-2 text-[1.65rem] font-semibold leading-none" style={{ color: "var(--tlk-text)" }}>
                    {k.value}
                  </p>
                  <p
                    className="mt-2 text-sm"
                    style={{
                      color:
                        k.up && k.delta.startsWith("+")
                          ? effective === "dark"
                            ? "#34d399"
                            : "#059669"
                          : "var(--tlk-text-secondary)",
                    }}
                  >
                    {k.delta}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="tlk-transition rounded-xl border" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--tlk-border)" }}>
                    <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
                      Сейчас важно — брони
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {["Сегодня", "Завтра", "Неделя"].map((t, i) => (
                        <button
                          key={t}
                          type="button"
                          className="tlk-transition rounded-lg border px-3 py-1.5 text-xs font-medium"
                          style={{
                            borderColor: "var(--tlk-border)",
                            backgroundColor: i === 0 ? "var(--tlk-sidebar-active-bg)" : "transparent",
                            color: "var(--tlk-text)",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-bg-app)" }}>
                          <th className="px-5 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Время
                          </th>
                          <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Зона
                          </th>
                          <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Гости
                          </th>
                          <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Имя
                          </th>
                          <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Телефон
                          </th>
                          <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Статус
                          </th>
                          <th className="px-5 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                            Источник
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {BOOKINGS.map((b) => (
                          <tr key={b.time + b.name} className="border-b last:border-0" style={{ borderColor: "var(--tlk-border)" }}>
                            <td className="tlk-tabular px-5 py-3 font-medium" style={{ color: "var(--tlk-text)" }}>
                              {b.time}
                            </td>
                            <td className="px-3 py-3" style={{ color: "var(--tlk-text)" }}>
                              {b.zone}
                            </td>
                            <td className="tlk-tabular px-3 py-3" style={{ color: "var(--tlk-text)" }}>
                              {b.guests}
                            </td>
                            <td className="px-3 py-3" style={{ color: "var(--tlk-text)" }}>
                              {b.name}
                            </td>
                            <td className="tlk-tabular px-3 py-3" style={{ color: "var(--tlk-text-secondary)" }}>
                              {b.phone}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: b.status === "Новая" ? "rgba(37, 99, 235, 0.12)" : "var(--tlk-sidebar-active-bg)",
                                  color: b.status === "Новая" ? "var(--tlk-focus)" : "var(--tlk-text)",
                                }}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-5 py-3" style={{ color: "var(--tlk-text-secondary)" }}>
                              {b.src}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="tlk-transition rounded-xl border p-5" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}>
                  <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
                    Быстрые действия
                  </h2>
                  <div className="mt-4 flex flex-col gap-2">
                    {["Открыть зал", "Отметить приход", "Сообщить на кухню"].map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium hover:opacity-95"
                        style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="tlk-transition flex gap-3 rounded-xl border p-4" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}>
                  <CreditCard className="h-10 w-10 shrink-0" style={{ color: "var(--tlk-primary)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--tlk-text)" }}>
                      Подсказка
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--tlk-text-secondary)" }}>
                      Это изолированный макет{" "}
                      <code
                        className="rounded px-1 py-0.5 text-xs"
                        style={{ backgroundColor: effective === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}
                      >
                        /test-lk-mock
                      </code>{" "}
                      — не связан с боевым кабинетом.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
              <ChevronLeft className="h-4 w-4" />
              <Link href="/" className="underline-offset-2 hover:underline" style={{ color: "var(--tlk-primary)" }}>
                На главную сайта
              </Link>
            </p>
          </div>
        </main>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[55] bg-black/40 md:hidden"
            aria-label="Закрыть меню"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="fixed left-0 top-14 z-[56] flex h-[calc(100dvh-3.5rem)] w-[min(85vw,280px)] flex-col overflow-y-auto border-r p-2 md:hidden"
            style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
            aria-label="Разделы"
          >
            {NAV_GROUPS.map((group) => (
              <div key={`m-${group.label}`} className="mb-4">
                <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
                  {group.label}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeNav === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleNav(item.id)}
                          className="tlk-transition flex w-full items-center gap-3 rounded-lg py-2 pl-3 pr-2 text-left text-sm outline-none focus-visible:ring-2"
                          style={
                            {
                              backgroundColor: active ? "var(--tlk-sidebar-active-bg)" : "transparent",
                              color: "var(--tlk-text)",
                              boxShadow: active ? "inset 3px 0 0 0 var(--tlk-primary)" : "none",
                              ["--tw-ring-color" as string]: "var(--tlk-focus)",
                            } as CSSProperties
                          }
                        >
                          <Icon className="h-5 w-5 shrink-0" style={{ color: active ? "var(--tlk-primary)" : "var(--tlk-text-secondary)" }} />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </>
      ) : null}

      {profileOpen ? (
        <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" aria-label="Закрыть меню" onClick={() => setProfileOpen(false)} />
      ) : null}
    </div>
  );
}
