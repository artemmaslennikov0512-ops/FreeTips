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
            href={`${TEST_LK_BASE}/streamer`}
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

      {/* Градиентная карта (как раньше в макете), компактнее; без номера и без Mir */}
      <div className="mb-6 w-full max-w-[17.5rem] sm:max-w-[18rem]">
        <div
          className="tlk-transition relative overflow-hidden rounded-xl p-3.5 text-white"
          style={{
            minHeight: 132,
            maxWidth: "100%",
            wordBreak: "normal",
            overflowWrap: "normal",
            background: `linear-gradient(145deg, var(--tlk-card-deep) 0%, var(--tlk-card-mid) 55%, #0d281f 100%)`,
            boxShadow: effective === "dark" ? "inset 0 0 0 1px rgba(255,255,255,0.08)" : "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background: "linear-gradient(115deg, transparent 40%, var(--tlk-card-glass) 50%, transparent 60%)",
            }}
          />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1" style={{ minWidth: "12rem" }}>
                <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-white/80">Виртуальная карта</p>
                <p className="mt-0.5 whitespace-nowrap text-xs text-white/70">Доступно</p>
                <p className="tlk-tabular mt-1 text-[1.35rem] font-semibold leading-tight tracking-tight sm:text-2xl">124 580 ₽</p>
              </div>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ background: "rgba(255,255,255,0.2)" }}
                aria-hidden
              >
                D
              </div>
            </div>
            <p className="text-[10px] leading-snug text-white/65">Доступно к выплатам · обновлено сегодня</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button type="button" className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-medium backdrop-blur-sm hover:bg-white/30">
                Пополнить
              </button>
              <Link
                href={`${TEST_LK_BASE}/transactions`}
                className="inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium no-underline text-white hover:bg-white/20"
              >
                Операции
              </Link>
              <button type="button" className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-white/90 hover:bg-white/20">
                Лимиты
              </button>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug" style={{ color: "var(--tlk-text-secondary)" }}>
          Макет: без номера карты и платёжной системы.
        </p>
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
              <Link
                href="/test-preview/landing"
                target="_blank"
                rel="noopener noreferrer"
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Превью лендинга (новая вкладка)
              </Link>
              <Link
                href={`${TEST_LK_BASE}/visual`}
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Визуальная спека ЛК (цвета, формы)
              </Link>
              <Link
                href="/test-preview/visual"
                target="_blank"
                rel="noopener noreferrer"
                className="tlk-transition w-full rounded-lg border px-3 py-2.5 text-left text-sm font-medium no-underline hover:opacity-95"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                Спека лендинга макета B
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
