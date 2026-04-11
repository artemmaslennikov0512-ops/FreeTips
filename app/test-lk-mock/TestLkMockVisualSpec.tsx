"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { TestLkBreadcrumb, TestLkMockPageBody, testLkCardStyle } from "./TestLkMockChrome";

const TLK_LIGHT = [
  { name: "Фон приложения", key: "--tlk-bg-app", hex: "#f4f4f5" },
  { name: "Поверхность / шапка", key: "--tlk-surface", hex: "#ffffff" },
  { name: "Бордер", key: "--tlk-border", hex: "#e4e4e7" },
  { name: "Текст", key: "--tlk-text", hex: "#18181b" },
  { name: "Текст вторичный", key: "--tlk-text-secondary", hex: "#71717a" },
  { name: "Первичный / акцент", key: "--tlk-primary", hex: "#1e3a2f" },
  { name: "Фокус", key: "--tlk-focus", hex: "#2563eb" },
  { name: "Ошибка / бейдж", key: "--tlk-danger", hex: "#dc2626" },
  { name: "Активный пункт меню", key: "--tlk-sidebar-active-bg", hex: "#f3f4f6" },
] as const;

const SPACING = [4, 8, 12, 16, 20, 24, 32] as const;

export function TestLkMockVisualSpec() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Визуальная спека" />
      <h1 className="text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        ЛК (тестовый макет): цвета, сетка, формы
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--tlk-text-secondary)" }}>
        Токены задаются в <code className="rounded px-1 py-0.5 text-xs" style={{ backgroundColor: "var(--tlk-sidebar-active-bg)" }}>test-lk-mock.css</code> внутри{" "}
        <code className="rounded px-1 py-0.5 text-xs" style={{ backgroundColor: "var(--tlk-sidebar-active-bg)" }}>.test-lk-mock-scope</code>. Переключите тему в шапке макета — значения
        сменятся на тёмные. Ниже — светлая палитра как эталон для спеки.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
          Палитра (светлая тема макета)
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TLK_LIGHT.map(({ name, key, hex }) => (
            <li key={key} className="tlk-transition overflow-hidden rounded-xl border" style={testLkCardStyle()}>
              <div className="h-14 w-full" style={{ backgroundColor: hex }} />
              <div className="p-3">
                <p className="text-sm font-medium" style={{ color: "var(--tlk-text)" }}>
                  {name}
                </p>
                <p className="font-mono text-xs" style={{ color: "var(--tlk-text-secondary)" }}>
                  {hex}
                </p>
                <p className="font-mono text-[10px]" style={{ color: "var(--tlk-text-secondary)" }}>
                  {key}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
          Типографика
        </h2>
        <div className="mt-4 rounded-xl border p-5 sm:p-6" style={testLkCardStyle()}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
            Заголовок страницы · Inter · semibold
          </p>
          <p className="text-2xl font-semibold tracking-tight" style={{ color: "var(--tlk-text)" }}>
            Операции за период
          </p>
          <p className="mt-4 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
            Подзаголовок секции
          </p>
          <p className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
            Последние поступления
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--tlk-text-secondary)" }}>
            Основной текст интерфейса 14px, вторичный цвет для пояснений. Табличные цифры:{" "}
            <span className="tlk-tabular font-medium" style={{ color: "var(--tlk-text)" }}>
              12 580,00 ₽
            </span>
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
          Шаг сетки
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
          Кратность 4px; контент страницы в контейнере <code className="text-xs">max-w-[1280px]</code> (как в макете).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {SPACING.map((px) => (
            <div key={px} className="flex flex-col items-center gap-1">
              <div className="w-8 rounded-t" style={{ height: px, backgroundColor: "var(--tlk-primary)" }} />
              <span className="font-mono text-[10px]" style={{ color: "var(--tlk-text-secondary)" }}>
                {px}px
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
          Раскладка: сайдбар + контент
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
          В этом макете: боковое меню 240px (свёрнуто 72px), основная колонка с <code className="text-xs">px-4 md:px-6</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 rounded-xl border p-4" style={testLkCardStyle()}>
          <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg text-xs font-medium text-white" style={{ backgroundColor: "var(--tlk-primary)" }}>
            Nav
          </div>
          <div className="min-h-32 min-w-0 flex-1 rounded-lg border border-dashed p-3 text-xs" style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text-secondary)" }}>
            Main · карточки и таблицы на <span style={{ color: "var(--tlk-text)" }}>surface / app bg</span>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold" style={{ color: "var(--tlk-text)" }}>
          Форма (пример полей ЛК)
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
          Классы <code className="text-xs">tlk-field-*</code> в <code className="text-xs">test-lk-mock.css</code>. Отправка не выполняется.
        </p>
        <form className="mt-4 max-w-md space-y-4 rounded-xl border p-5 sm:p-6" style={testLkCardStyle()} onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="tlk-field-label" htmlFor="tlk-demo-login">
              Логин
            </label>
            <input id="tlk-demo-login" className="tlk-field-input" type="text" placeholder="recipient_demo" autoComplete="off" />
          </div>
          <div>
            <label className="tlk-field-label" htmlFor="tlk-demo-sum">
              Сумма вывода, ₽
            </label>
            <input id="tlk-demo-sum" className="tlk-field-input tlk-tabular" type="text" inputMode="decimal" placeholder="5000" autoComplete="off" />
            <p className="tlk-field-hint">Минимум и комиссия подставятся с бэка.</p>
          </div>
          <div>
            <label className="tlk-field-label" htmlFor="tlk-demo-req">
              Тип запроса
            </label>
            <select id="tlk-demo-req" className="tlk-field-select" defaultValue="payout">
              <option value="payout">Выплата на карту</option>
              <option value="support">Вопрос в поддержку</option>
            </select>
          </div>
          <label className="tlk-field-check">
            <input type="checkbox" defaultChecked />
            <span>Запомнить устройство (макет)</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white outline-none focus-visible:ring-2"
              style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
            >
              Сохранить (макет)
            </button>
            <button type="button" className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)" }}>
              Отмена
            </button>
          </div>
        </form>
      </section>

      <p className="mt-10 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Спека лендинга (макет B):{" "}
        <Link href="/test-preview/visual" className="font-medium no-underline hover:underline" style={{ color: "var(--tlk-primary)" }}>
          /test-preview/visual
        </Link>
      </p>
    </TestLkMockPageBody>
  );
}
