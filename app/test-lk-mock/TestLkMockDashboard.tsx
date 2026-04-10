"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import type { CSSProperties } from "react";
import { useTestLkMockTheme } from "./TestLkMockThemeContext";
import { TestLkBackToSite, TestLkBreadcrumb, TestLkMockPageBody, testLkCardStyle } from "./TestLkMockChrome";
import { TEST_LK_BASE } from "./test-lk-nav";

const KPI = [
  { title: "За 7 дней", value: "12 400 ₽", delta: "+8%", up: true },
  { title: "Средний чек", value: "320 ₽", delta: "+2%", up: true },
  { title: "Операций сегодня", value: "18", delta: "макет", up: false },
  { title: "На выводе", value: "4 200 ₽", delta: "ожидает", up: true },
];

const LAST_OPS = [
  { date: "10.04 14:22", amount: "+500 ₽", from: "Гость · стол 4", status: "Зачислено" },
  { date: "10.04 12:01", amount: "+100 ₽", from: "Аноним", status: "Зачислено" },
  { date: "09.04 21:40", amount: "+250 ₽", from: "Гость · доставка", status: "Зачислено" },
];

export function TestLkMockDashboard() {
  const { effective } = useTestLkMockTheme();

  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Дашборд" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-[1.5rem] md:leading-8" style={{ color: "var(--tlk-text)" }}>
            Дашборд
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
            Макет в стиле тестового ЛК · данные вымышленные
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${TEST_LK_BASE}/link`}
            className="tlk-transition inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-offset-2 no-underline"
            style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
          >
            Моя ссылка и оплата
          </Link>
          <Link
            href={`${TEST_LK_BASE}/transactions`}
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

      <div className="mb-6 w-full max-w-[20rem] sm:max-w-[22rem]">
        <div
          className="tlk-transition flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:gap-3"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--tlk-border)",
            borderLeftWidth: 3,
            borderLeftColor: "var(--tlk-primary)",
            backgroundColor: "var(--tlk-surface)",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, var(--tlk-card-deep), var(--tlk-primary))" }}
              aria-hidden
            >
              D
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tlk-text-secondary)" }}>
                Баланс в сервисе
              </p>
              <p className="tlk-tabular mt-0.5 text-xl font-semibold leading-none tracking-tight" style={{ color: "var(--tlk-text)" }}>
                124 580 ₽
              </p>
              <p className="mt-1 text-[10px] font-normal leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
                Доступно к выплатам
                <span className="mx-1 opacity-50" aria-hidden>
                  ·
                </span>
                <span className="whitespace-nowrap">обновлено сегодня</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:flex-nowrap sm:justify-end">
            <button
              type="button"
              className="tlk-transition rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white outline-none focus-visible:ring-2"
              style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
            >
              Пополнить
            </button>
            <Link
              href={`${TEST_LK_BASE}/transactions`}
              className="tlk-transition inline-flex items-center rounded-md border px-2.5 py-1.5 text-[11px] font-medium no-underline outline-none focus-visible:ring-2"
              style={
                {
                  borderColor: "var(--tlk-border)",
                  backgroundColor: "var(--tlk-bg-app)",
                  color: "var(--tlk-text)",
                  ["--tw-ring-color" as string]: "var(--tlk-focus)",
                } as CSSProperties
              }
            >
              Операции
            </Link>
            <button
              type="button"
              className="tlk-transition rounded-md border px-2.5 py-1.5 text-[11px] font-medium outline-none focus-visible:ring-2"
              style={
                {
                  borderColor: "var(--tlk-border)",
                  backgroundColor: "transparent",
                  color: "var(--tlk-text-secondary)",
                  ["--tw-ring-color" as string]: "var(--tlk-focus)",
                } as CSSProperties
              }
            >
              Лимиты
            </button>
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
          <div className="tlk-transition rounded-xl border" style={testLkCardStyle()}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--tlk-border)" }}>
              <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
                Последние операции (макет)
              </h2>
              <Link href={`${TEST_LK_BASE}/transactions`} className="text-sm font-medium no-underline hover:underline" style={{ color: "var(--tlk-primary)" }}>
                Все операции
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
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
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--tlk-sidebar-active-bg)", color: "var(--tlk-text)" }}>
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
                href={`${TEST_LK_BASE}/link`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Моя ссылка → страница оплаты
              </Link>
              <Link
                href={`${TEST_LK_BASE}/settings`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Настройки профиля
              </Link>
              <Link
                href={`${TEST_LK_BASE}/support`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Поддержка
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
                Разделы и URL повторяют структуру <code className="rounded px-1 py-0.5 text-xs" style={{ backgroundColor: effective === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>/cabinet</code>, без ваших данных и без
                обязательного входа.
              </p>
            </div>
          </div>
        </div>
      </div>

      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}
