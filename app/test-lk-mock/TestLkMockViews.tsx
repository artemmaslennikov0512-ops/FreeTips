"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getBaseUrl } from "@/lib/get-base-url";
import { TestLkBackToSite, TestLkBreadcrumb, TestLkMockPageBody, testLkCardStyle } from "./TestLkMockChrome";

const PAY_SLUG = (process.env.NEXT_PUBLIC_TEST_LK_PAY_SLUG ?? "").trim();

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-medium" style={{ color: "var(--tlk-text)" }}>{children}</label>;
}

function InputLike({ value, placeholder, className }: { value?: string; placeholder?: string; className?: string }) {
  return (
    <input
      readOnly
      value={value}
      placeholder={placeholder}
      className={`tlk-transition w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 ${className ?? ""}`}
      style={
        {
          borderColor: "var(--tlk-border)",
          backgroundColor: "var(--tlk-bg-app)",
          color: "var(--tlk-text)",
          ["--tw-ring-color" as string]: "var(--tlk-focus)",
        } as CSSProperties
      }
    />
  );
}

function TextAreaLike() {
  return (
    <textarea
      readOnly
      rows={4}
      placeholder="Текст сообщения (макет)"
      className="tlk-transition w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
      style={
        {
          borderColor: "var(--tlk-border)",
          backgroundColor: "var(--tlk-bg-app)",
          color: "var(--tlk-text)",
          ["--tw-ring-color" as string]: "var(--tlk-focus)",
        } as CSSProperties
      }
    />
  );
}

export function TestLkMockTransactionsView() {
  const rows = [
    { id: "1", date: "10.04.2026", type: "Чаевые", amount: "+500 ₽", balance: "124 580 ₽" },
    { id: "2", date: "09.04.2026", type: "Вывод", amount: "−10 000 ₽", balance: "124 080 ₽" },
    { id: "3", date: "08.04.2026", type: "Чаевые", amount: "+200 ₽", balance: "134 080 ₽" },
  ];
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Операции" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Операции
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет таблицы как в разделе «История операций» боевого кабинета.
      </p>
      <div className="tlk-transition overflow-hidden rounded-xl border" style={testLkCardStyle()}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--tlk-border)", backgroundColor: "var(--tlk-bg-app)" }}>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                  Дата
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                  Тип
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                  Сумма
                </th>
                <th className="px-4 py-3 font-medium" style={{ color: "var(--tlk-text-secondary)" }}>
                  Баланс после
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0" style={{ borderColor: "var(--tlk-border)" }}>
                  <td className="tlk-tabular px-4 py-3" style={{ color: "var(--tlk-text-secondary)" }}>
                    {r.date}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--tlk-text)" }}>
                    {r.type}
                  </td>
                  <td className="tlk-tabular px-4 py-3 font-medium" style={{ color: "var(--tlk-text)" }}>
                    {r.amount}
                  </td>
                  <td className="tlk-tabular px-4 py-3" style={{ color: "var(--tlk-text-secondary)" }}>
                    {r.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

function subscribeOrigin(): () => void {
  return () => {};
}

export function TestLkMockLinkPage() {
  const origin = useSyncExternalStore(subscribeOrigin, () => getBaseUrl(), () => "");

  const payPath = PAY_SLUG ? `/pay/${encodeURIComponent(PAY_SLUG)}` : "";
  const fullUrl = origin && PAY_SLUG ? `${origin}/pay/${encodeURIComponent(PAY_SLUG)}` : "";

  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Моя ссылка" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Моя ссылка
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Здесь в боевом ЛК показываются код и ссылка для чаевых. Ниже — переход на настоящую страницу оплаты этого сайта.
      </p>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="tlk-transition rounded-xl border p-5" style={testLkCardStyle()}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
            Ссылка и QR (макет)
          </h2>
          <div className="mt-4 space-y-3">
            <div>
              <FieldLabel>Код официанта (пример)</FieldLabel>
              <InputLike value="DEMO-4821" />
            </div>
            <div>
              <FieldLabel>Публичная ссылка</FieldLabel>
              <InputLike value={fullUrl || (origin ? `${origin}/pay/…` : "Загрузка…")} />
            </div>
          </div>
        </div>
        <div className="tlk-transition flex flex-col justify-center rounded-xl border p-5" style={testLkCardStyle()}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
            Страница оплаты
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--tlk-text-secondary)" }}>
            Откроется боевая страница <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">/pay/…</code> этого проекта — та же, что у гостей по QR.
          </p>
          {payPath ? (
            <Link
              href={payPath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white no-underline outline-none focus-visible:ring-2"
              style={{ backgroundColor: "var(--tlk-primary)", ["--tw-ring-color" as string]: "var(--tlk-focus)" } as CSSProperties}
            >
              Открыть оплату в новой вкладке
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--tlk-danger)" }}>
              Задайте в <code className="rounded px-1 text-xs">.env</code> переменную{" "}
              <code className="rounded px-1 text-xs">NEXT_PUBLIC_TEST_LK_PAY_SLUG</code> — глобальный код из боевого ЛК (как в пути{" "}
              <code className="rounded px-1 text-xs">/pay/код</code>), затем пересоберите проект.
            </p>
          )}
        </div>
      </div>

      <div className="tlk-transition rounded-xl border p-4 text-sm" style={testLkCardStyle()}>
        <p style={{ color: "var(--tlk-text-secondary)" }}>
          Подсказка: код можно скопировать из боевого <Link href="/cabinet/link" className="font-medium no-underline hover:underline" style={{ color: "var(--tlk-primary)" }}>/cabinet/link</Link> после входа.
        </p>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockJoinEstablishmentView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Подключиться к заведению" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Подключиться к заведению
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет формы запроса на вступление (как в боевом разделе).
      </p>
      <div className="tlk-transition max-w-lg space-y-4 rounded-xl border p-5" style={testLkCardStyle()}>
        <div>
          <FieldLabel>Код или ссылка-приглашение</FieldLabel>
          <InputLike placeholder="Вставьте код заведения" />
        </div>
        <button
          type="button"
          className="tlk-transition rounded-xl px-4 py-2.5 text-sm font-medium text-white opacity-80"
          style={{ backgroundColor: "var(--tlk-primary)" }}
        >
          Отправить запрос (макет)
        </button>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockLeaveEstablishmentView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Покинуть заведение" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Покинуть заведение
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет сценария выхода из состава заведения.
      </p>
      <div className="tlk-transition max-w-lg rounded-xl border p-5" style={testLkCardStyle()}>
        <p className="text-sm" style={{ color: "var(--tlk-text)" }}>
          Здесь в бою отображается статус заявки и кнопки подтверждения.
        </p>
        <button type="button" className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "var(--tlk-danger)", color: "var(--tlk-danger)" }}>
          Подать заявку на выход (макет)
        </button>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockVerificationView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Верификация" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Верификация
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет шагов проверки личности.
      </p>
      <ol className="tlk-transition max-w-lg list-decimal space-y-3 rounded-xl border p-5 pl-8 text-sm" style={testLkCardStyle()}>
        <li style={{ color: "var(--tlk-text)" }}>Загрузка документов (макет)</li>
        <li style={{ color: "var(--tlk-text-secondary)" }}>Проверка модератором</li>
        <li style={{ color: "var(--tlk-text-secondary)" }}>Результат</li>
      </ol>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockSupportView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Поддержка" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Поддержка
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет обращения в поддержку (чат/тикеты в бою).
      </p>
      <div className="tlk-transition max-w-2xl space-y-4 rounded-xl border p-5" style={testLkCardStyle()}>
        <div>
          <FieldLabel>Тема</FieldLabel>
          <InputLike value="Макет: вопрос по выплате" />
        </div>
        <div>
          <FieldLabel>Сообщение</FieldLabel>
          <TextAreaLike />
        </div>
        <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: "var(--tlk-primary)" }}>
          Отправить (макет)
        </button>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockSessionsView() {
  const sessions = [
    { device: "Chrome · Windows", ip: "192.168.x.x", when: "Сейчас", current: true },
    { device: "Safari · iOS", ip: "10.x.x.x", when: "3 дня назад", current: false },
  ];
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Сессии" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Сессии
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет списка активных входов.
      </p>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.device} className="tlk-transition rounded-xl border px-4 py-3" style={testLkCardStyle()}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium" style={{ color: "var(--tlk-text)" }}>
                {s.device}
              </span>
              {s.current ? (
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--tlk-sidebar-active-bg)", color: "var(--tlk-primary)" }}>
                  Текущая
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--tlk-text-secondary)" }}>
              {s.ip} · {s.when}
            </p>
          </li>
        ))}
      </ul>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

const MOCK_BOOKINGS = [
  { time: "19:00", zone: "Веранда", guests: 4, name: "Иванова А.", phone: "+7 ··· 42-11", status: "Подтверждено", src: "Сайт" },
  { time: "19:30", zone: "Зал", guests: 2, name: "Петров П.", phone: "+7 ··· 88-90", status: "Новая", src: "Телефон" },
  { time: "20:00", zone: "Бар", guests: 3, name: "Сидорова Е.", phone: "+7 ··· 15-33", status: "Подтверждено", src: "Сайт" },
];

export function TestLkMockBookingsView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Брони" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Брони
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Тестовый раздел «как в ресторане» — только в /test-lk-mock, в боевом /cabinet нет.
      </p>
      <div className="tlk-transition rounded-xl border" style={testLkCardStyle()}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--tlk-border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
            Сегодня
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
              {MOCK_BOOKINGS.map((b) => (
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
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockFloorView() {
  const tables = [
    { id: "1", name: "Стол 1 · зал", guests: "2 / 4", status: "Свободен" },
    { id: "2", name: "Стол 4 · веранда", guests: "4 / 4", status: "Занят" },
    { id: "3", name: "Бар 2", guests: "1 / 2", status: "Скоро приход" },
  ];
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Зал / смена" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Зал / смена
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет экрана смены: статусы столов и быстрые действия (данные вымышленные).
      </p>
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="tlk-transition rounded-xl border p-4 lg:col-span-2" style={testLkCardStyle()}>
          <h2 className="text-base font-semibold" style={{ color: "var(--tlk-text)" }}>
            Столы
          </h2>
          <ul className="mt-3 space-y-2">
            {tables.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--tlk-border)" }}>
                <span className="font-medium" style={{ color: "var(--tlk-text)" }}>
                  {t.name}
                </span>
                <span className="tlk-tabular text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
                  {t.guests}
                </span>
                <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: "var(--tlk-sidebar-active-bg)", color: "var(--tlk-text)" }}>
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tlk-transition space-y-2 rounded-xl border p-4" style={testLkCardStyle()}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tlk-text-secondary)" }}>
            Смена
          </p>
          <p className="text-sm" style={{ color: "var(--tlk-text)" }}>
            Пятница, 18:00–23:00
          </p>
          <p className="text-xs" style={{ color: "var(--tlk-text-secondary)" }}>
            Официант: макет
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {["Отметить приход", "Сообщить на кухню", "Открыть схему зала"].map((a) => (
              <button
                key={a}
                type="button"
                className="tlk-transition w-full rounded-lg border px-3 py-2 text-left text-sm font-medium"
                style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)", backgroundColor: "var(--tlk-bg-app)" }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockGuestsView() {
  const guests = [
    { name: "Иванова А.", tag: "День рождения", allergy: "—", table: "Веранда 2" },
    { name: "Петров П.", tag: "—", allergy: "Орехи", table: "Зал 1" },
    { name: "Ким С.", tag: "Детское меню", allergy: "Лактоза", table: "Бар" },
  ];
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Гости" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Гости
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет карточек гостей: пометки, аллергены, стол (без связи с реальными данными).
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guests.map((g) => (
          <div key={g.name} className="tlk-transition rounded-xl border p-4" style={testLkCardStyle()}>
            <p className="font-semibold" style={{ color: "var(--tlk-text)" }}>
              {g.name}
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
              Стол: <span style={{ color: "var(--tlk-text)" }}>{g.table}</span>
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
              Событие: <span style={{ color: "var(--tlk-text)" }}>{g.tag}</span>
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
              Аллергены: <span style={{ color: "var(--tlk-text)" }}>{g.allergy}</span>
            </p>
          </div>
        ))}
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}

export function TestLkMockSettingsView() {
  return (
    <TestLkMockPageBody>
      <TestLkBreadcrumb segment="Настройки профиля" />
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: "var(--tlk-text)" }}>
        Настройки профиля
      </h1>
      <p className="mb-6 text-sm" style={{ color: "var(--tlk-text-secondary)" }}>
        Макет полей профиля и безопасности.
      </p>
      <div className="tlk-transition max-w-lg space-y-4 rounded-xl border p-5" style={testLkCardStyle()}>
        <div>
          <FieldLabel>Отображаемое имя</FieldLabel>
          <InputLike value="Макет пользователя" />
        </div>
        <div>
          <FieldLabel>Логин</FieldLabel>
          <InputLike value="test_lk_mock" />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <InputLike value="mock@example.com" />
        </div>
        <button type="button" className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: "var(--tlk-border)", color: "var(--tlk-text)" }}>
          Сменить пароль (макет)
        </button>
      </div>
      <TestLkBackToSite />
    </TestLkMockPageBody>
  );
}
