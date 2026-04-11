"use client";

import Link from "next/link";
import { Link2, List, Radio, Settings, Wallet } from "lucide-react";
import type { CSSProperties } from "react";
import { TestLkBackToSite, TestLkBreadcrumb, TestLkMockPageBody, testLkCardStyle } from "./TestLkMockChrome";
import { TEST_LK_CABINET_NAV_BASE } from "./test-lk-nav";
import { useTestLkMockRoute } from "./TestLkMockRouteContext";
import { useTestLkMockShellTheme } from "./TestLkMockShellThemeContext";

const KPI = [
  { title: "За 7 дней", value: "12 400 ₽", delta: "+8%", up: true },
  { title: "Средний чек", value: "320 ₽", delta: "+2%", up: true },
  { title: "Операций сегодня", value: "18", delta: "макет", up: false },
  { title: "На выводе", value: "4 200 ₽", delta: "ожидает", up: true },
];

const LAST_OPS = [
  { date: "10.04 14:22", amount: "+500 ₽", from: "Гость · стол 4", channel: "Зал", status: "Зачислено" },
  { date: "10.04 13:05", amount: "+200 ₽", from: "Зритель · эфир", channel: "Стрим", status: "Зачислено" },
  { date: "10.04 12:01", amount: "+100 ₽", from: "Аноним", channel: "Онлайн", status: "Зачислено" },
  { date: "09.04 21:40", amount: "+250 ₽", from: "Гость · доставка", channel: "Зал", status: "Зачислено" },
];

export function TestLkMockDashboard() {
  const { basePath, navMode } = useTestLkMockRoute();
  const { shellTheme } = useTestLkMockShellTheme();

  const heroPanelStyle: CSSProperties = {
    backgroundColor: "var(--tlk-bg-app)",
    borderColor: "var(--tlk-border)",
    boxShadow: shellTheme === "dark" ? "0 1px 0 rgba(255,255,255,0.04) inset" : "var(--shadow-subtle, 0 1px 2px rgba(0,0,0,0.06))",
  };

  const quick = [
    { href: `${basePath}/link`, icon: Link2, title: "Код и QR", desc: "Ссылка для чаевых" },
    { href: `${basePath}/transactions`, icon: List, title: "Операции", desc: "История и вывод" },
    { href: `${basePath}/streamer`, icon: Radio, title: "Донаты стримера", desc: "В разработке" },
    { href: `${basePath}/settings`, icon: Settings, title: "Настройки", desc: "Профиль и пароль" },
  ] as const;

  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Дашборд" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.5rem] md:leading-8" style={{ color: "var(--tlk-text)" }}>
            Дашборд
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
            Сетка как в /cabinet · палитра только превью ·{" "}
            {navMode === "cabinet" ? "меню совпадает с боевым" : `ещё: ${TEST_LK_CABINET_NAV_BASE}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${basePath}/link`}
            className="tlk-transition inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 no-underline"
            style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
          >
            Моя ссылка и оплата
          </Link>
          <Link
            href={`${basePath}/streamer`}
            className="tlk-transition inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 no-underline"
            style={
              {
                borderColor: "var(--tlk-border)",
                backgroundColor: "var(--tlk-surface)",
                color: "var(--tlk-text)",
                ["--tw-ring-color" as string]: "var(--tlk-focus)",
              } as CSSProperties
            }
          >
            Донаты стримера
          </Link>
          <Link
            href={`${basePath}/transactions`}
            className="tlk-transition inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium outline-none focus-visible:ring-2 no-underline"
            style={
              {
                borderColor: "var(--tlk-border)",
                backgroundColor: "var(--tlk-surface)",
                color: "var(--tlk-text)",
                ["--tw-ring-color" as string]: "var(--tlk-focus)",
              } as CSSProperties
            }
          >
            Операции
          </Link>
        </div>
      </div>

      <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 lg:[grid-template-columns:repeat(2,minmax(0,1fr))] lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border lg:h-full" style={heroPanelStyle}>
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="flex flex-col items-center gap-10">
              <div className="w-full min-w-0 px-0 text-center">
                <div
                  className="inline-flex max-w-full justify-center rounded-full border px-5 py-2.5 shadow-sm"
                  style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-surface)" }}
                >
                  <p className="truncate text-base font-semibold md:text-lg" style={{ color: "var(--tlk-text)" }}>
                    Екатерина Смирнова
                  </p>
                </div>
              </div>
              <div className="flex w-full max-w-[320px] shrink-0 flex-col items-center justify-center overflow-visible">
                <div className="w-full max-w-[320px]">
                  <div
                    className="tlk-mock-card-inner relative text-white"
                    style={{
                      background: `linear-gradient(145deg, var(--tlk-card-deep) 0%, var(--tlk-card-mid) 55%, #0d281f 100%)`,
                      boxShadow:
                        shellTheme === "dark"
                          ? "inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px -14px rgba(0,0,0,0.35)"
                          : "0 18px 40px -14px rgba(0,0,0,0.14), inset 0 0 0 1px rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-25"
                      style={{
                        background: "linear-gradient(115deg, transparent 40%, var(--tlk-card-glass) 50%, transparent 60%)",
                      }}
                      aria-hidden
                    />
                    <div className="relative flex h-full flex-col justify-between p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">Виртуальная карта</p>
                          <p className="mt-0.5 text-xs text-white/75">VIRTUAL</p>
                        </div>
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                          style={{ background: "rgba(255,255,255,0.2)" }}
                          aria-hidden
                        >
                          FT
                        </div>
                      </div>
                      <div className="flex items-end justify-between gap-2 pt-4">
                        <span className="text-xs font-extrabold tracking-tight text-white/95">FreeTips</span>
                        <p className="tlk-tabular m-0 text-right text-[12px] font-semibold leading-none text-white">
                          124 580 ₽
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-2 max-w-[320px] text-center text-[10px] leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
                  Пропорции 320×192 как у боевой карты · без номера и платёжной системы
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border lg:h-full" style={heroPanelStyle}>
          <div className="flex min-h-0 flex-1 flex-col p-6">
            <h3 className="mb-4 text-center text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
              Быстрые действия
            </h3>
            <div className="grid min-w-0 grid-cols-2 gap-4">
              {quick.map(({ href, icon: Icon, title, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="tlk-transition flex min-w-0 flex-col items-center rounded-[10px] border p-5 text-center no-underline hover:-translate-y-0.5"
                  style={{
                    borderColor: "color-mix(in srgb, var(--tlk-accent) 40%, var(--tlk-border))",
                    backgroundColor: "var(--tlk-surface)",
                  }}
                >
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--tlk-accent)", color: "var(--tlk-expand-fab-bg)" }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "var(--tlk-text)" }}>
                    {title}
                  </div>
                  <div className="mt-1 text-xs leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
                    {desc}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI.map((k) => (
          <div key={k.title} className="tlk-transition rounded-xl border p-5" style={testLkCardStyle()}>
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
                    ? shellTheme === "dark"
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
          <div className="tlk-transition rounded-xl border" style={testLkCardStyle()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--tlk-border)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
                Последние операции (макет)
              </h2>
              <Link href={`${basePath}/transactions`} className="text-sm font-medium no-underline hover:underline" style={{ color: "var(--tlk-primary)" }}>
                Все операции
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-bg-app)" }}>
                    <th className="px-5 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                      Дата
                    </th>
                    <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                      Сумма
                    </th>
                    <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                      Откуда
                    </th>
                    <th className="px-3 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                      Канал
                    </th>
                    <th className="px-5 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LAST_OPS.map((row) => (
                    <tr key={row.date + row.amount} className="border-b last:border-0" style={{ borderColor: "var(--tlk-border)" }}>
                      <td className="tlk-tabular px-5 py-3" style={{ color: "var(--tlk-text-secondary)" }}>
                        {row.date}
                      </td>
                      <td className="tlk-tabular px-3 py-3 font-medium" style={{ color: "var(--tlk-text)" }}>
                        {row.amount}
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--tlk-text)" }}>
                        {row.from}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--tlk-sidebar-active-bg)",
                            color: "var(--tlk-text)",
                          }}
                        >
                          {row.channel}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "var(--tlk-sidebar-active-bg)", color: "var(--tlk-text)" }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="tlk-transition rounded-xl border p-5" style={testLkCardStyle()}>
            <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
              Быстрые ссылки
            </h2>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`${basePath}/link`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Моя ссылка → страница оплаты
              </Link>
              <Link
                href={`${basePath}/settings`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Настройки профиля
              </Link>
              <Link
                href={`${basePath}/support`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Поддержка
              </Link>
              <Link
                href={navMode === "cabinet" ? "/test-lk-mock" : TEST_LK_CABINET_NAV_BASE}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                {navMode === "cabinet" ? "Макет: только новая палитра" : "Макет: навигация как в /cabinet"}
              </Link>
              <Link
                href="/test-preview/landing"
                target="_blank"
                rel="noopener noreferrer"
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Превью лендинга (новая вкладка)
              </Link>
            </div>
          </div>
          <div className="tlk-transition flex gap-3 rounded-xl border p-4" style={testLkCardStyle()}>
            <Wallet className="h-10 w-10 shrink-0" style={{ color: "var(--tlk-primary)" }} aria-hidden />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--tlk-text)" }}>
                Изолированный макет
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--tlk-text-secondary)" }}>
                Цвета и тема не зависят от глобального сайта: переключатель «Тема макета» в боковой панели. Реальные данные не
                подставляются.
              </p>
            </div>
          </div>
        </div>
      </div>

      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}
