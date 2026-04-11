"use client";

import Link from "next/link";
import "./landing/test-preview-landing-alt.css";

const PALETTE_LIGHT = [
  { name: "Фон страницы", var: "--tpa-bg", hex: "#f3f0ea" },
  { name: "Поверхность / карточка", var: "--tpa-surface", hex: "#ffffff" },
  { name: "Текст основной", var: "--tpa-text", hex: "#0b1220" },
  { name: "Текст вторичный", var: "--tpa-muted", hex: "#5a6478" },
  { name: "Акцент (кнопки, ссылки)", var: "--tpa-accent", hex: "#0d9488" },
  { name: "Акцент hover", var: "--tpa-accent-hover", hex: "#0f766e" },
  { name: "Текст на акценте", var: "--tpa-ink", hex: "#042f2e" },
] as const;

const PALETTE_DARK = [
  { name: "Фон страницы", hex: "#0e1114" },
  { name: "Поверхность", hex: "#161b22" },
  { name: "Текст", hex: "#e8edf4" },
  { name: "Вторичный", hex: "#9aa3b5" },
  { name: "Акцент", hex: "#2dd4bf" },
  { name: "Акцент hover", hex: "#5eead4" },
  { name: "Текст на кнопке", hex: "#042f2e" },
] as const;

const SPACING = [4, 8, 12, 16, 24, 32, 48, 64] as const;

export function TestPreviewVisualLanding() {
  return (
    <div className="test-preview-landing-alt min-w-0 px-4 py-10 sm:px-6 sm:py-14" style={{ backgroundColor: "var(--tpa-bg)" }}>
      <div className="mx-auto max-w-6xl space-y-16">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--tpa-accent)" }}>
            Макет B · визуальная спецификация
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: "var(--tpa-text)" }}>
            Лендинг: цвета, сетка, формы
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
            Ниже — зафиксированные решения для превью. Переключите тему сайта (шапка), чтобы увидеть тёмные токены вживую на{" "}
            <Link href="/test-preview/landing" className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--tpa-accent)" }}>
              /test-preview/landing
            </Link>
            .
          </p>
        </header>

        <section>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold" style={{ color: "var(--tpa-text)" }}>
            Палитра (светлая)
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--tpa-muted)" }}>
            CSS-переменные в <code className="rounded px-1 py-0.5 text-xs" style={{ backgroundColor: "var(--tpa-surface)", border: "1px solid var(--tpa-border)" }}>.test-preview-landing-alt</code>
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PALETTE_LIGHT.map(({ name, var: v, hex }) => (
              <li key={v} className="tpa-card overflow-hidden">
                <div className="h-16 w-full" style={{ backgroundColor: hex }} />
                <div className="p-3">
                  <p className="text-sm font-medium" style={{ color: "var(--tpa-text)" }}>
                    {name}
                  </p>
                  <p className="font-mono text-xs" style={{ color: "var(--tpa-muted)" }}>
                    {hex}
                  </p>
                  <p className="font-mono text-[10px]" style={{ color: "var(--tpa-muted)" }}>
                    {v}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="mt-10 text-sm font-semibold" style={{ color: "var(--tpa-text)" }}>
            Палитра (тёмная) — те же имена, другие значения
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PALETTE_DARK.map(({ name, hex }) => (
              <li
                key={name}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-text)", backgroundColor: "var(--tpa-surface)" }}
              >
                <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} aria-hidden />
                {name}: <span className="font-mono opacity-80">{hex}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold" style={{ color: "var(--tpa-text)" }}>
            Типографика
          </h2>
          <div className="mt-6 tpa-card space-y-6 p-6 sm:p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tpa-muted)" }}>
                Заголовок H1 · Syne · extrabold
              </p>
              <p className="font-[family-name:var(--font-syne)] text-4xl font-extrabold leading-tight tracking-tight" style={{ color: "var(--tpa-text)" }}>
                Мгновенные выплаты и донаты
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tpa-muted)" }}>
                Заголовок H2 · Syne · bold
              </p>
              <p className="font-[family-name:var(--font-syne)] text-2xl font-bold tracking-tight" style={{ color: "var(--tpa-text)" }}>
                Для кого сервис
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--tpa-muted)" }}>
                Текст · Inter (наследуется с body)
              </p>
              <p className="text-base leading-relaxed" style={{ color: "var(--tpa-text)" }}>
                Основной абзац: размер 16px, межстрочный интервал комфортный для чтения на телефоне и десктопе.
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--tpa-muted)" }}>
                Вторичный текст 14px — подписи, подсказки, юридические строки.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold" style={{ color: "var(--tpa-text)" }}>
            Шаг сетки (отступы)
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--tpa-muted)" }}>
            В макете B кратность 4px; секции по вертикали 56–80px (py-14 / py-20).
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-4">
            {SPACING.map((px) => (
              <div key={px} className="flex flex-col items-center gap-1">
                <div className="w-10 rounded-t opacity-90" style={{ height: px, backgroundColor: "var(--tpa-accent)" }} title={`${px}px`} />
                <span className="font-mono text-[10px]" style={{ color: "var(--tpa-muted)" }}>
                  {px}px
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold" style={{ color: "var(--tpa-text)" }}>
            Контейнер и колонки
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--tpa-muted)" }}>
            Максимальная ширина контента <code className="font-mono text-xs">max-w-6xl</code> (1152px), горизонтальные отступы <code className="font-mono text-xs">px-4 sm:px-6</code>.
          </p>
          <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: "var(--tpa-border)", backgroundColor: "var(--tpa-surface)" }}>
            <div className="grid grid-cols-12 gap-2">
              {Array.from({ length: 12 }, (_, i) => (
                <div
                  key={i}
                  className="col-span-1 flex h-10 items-center justify-center rounded text-[10px] font-medium"
                  style={{ backgroundColor: "color-mix(in srgb, var(--tpa-accent) 18%, transparent)", color: "var(--tpa-text)" }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs" style={{ color: "var(--tpa-muted)" }}>
              12 колонок · gap 8px — ориентир для будущих сеток карточек
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold" style={{ color: "var(--tpa-text)" }}>
            Форма (пример размещения)
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--tpa-muted)" }}>
            Поля на светлой поверхности, скругление 12px, фокус — обводка акцентом. Без отправки на сервер.
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <form className="tpa-card space-y-4 p-6 sm:p-8" noValidate onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="tpa-label" htmlFor="tpa-demo-name">
                  Имя или заведение
                </label>
                <input id="tpa-demo-name" className="tpa-input" type="text" placeholder="Например, Кафе Сезон" autoComplete="off" />
              </div>
              <div>
                <label className="tpa-label" htmlFor="tpa-demo-email">
                  Email
                </label>
                <input id="tpa-demo-email" className="tpa-input" type="email" placeholder="you@example.com" autoComplete="off" />
                <p className="tpa-hint">На него пришлём доступ к демо-кабинету.</p>
              </div>
              <div>
                <label className="tpa-label" htmlFor="tpa-demo-type">
                  Тип подключения
                </label>
                <select id="tpa-demo-type" className="tpa-select" defaultValue="">
                  <option value="" disabled>
                    Выберите вариант
                  </option>
                  <option value="venue">Заведение</option>
                  <option value="staff">Сотрудник (чаевые)</option>
                  <option value="streamer">Стример (донаты)</option>
                </select>
              </div>
              <div>
                <label className="tpa-label" htmlFor="tpa-demo-msg">
                  Комментарий
                </label>
                <textarea id="tpa-demo-msg" className="tpa-textarea" rows={3} placeholder="Необязательно" />
              </div>
              <label className="tpa-check">
                <input type="checkbox" defaultChecked />
                <span>Согласен с обработкой данных (макет поля)</span>
              </label>
              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: "var(--tpa-accent)" }}>
                  Отправить (макет)
                </button>
                <button
                  type="button"
                  className="rounded-xl border px-5 py-2.5 text-sm font-semibold"
                  style={{ borderColor: "var(--tpa-border)", color: "var(--tpa-text)", backgroundColor: "transparent" }}
                >
                  Отмена
                </button>
              </div>
            </form>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--tpa-muted)" }}>
              <p>
                <strong style={{ color: "var(--tpa-text)" }}>Расположение:</strong> на лендинге форма может стоять в правой колонке героя или в отдельной секции «Подключение» — здесь показан один столбец{" "}
                <code className="rounded px-1 text-xs" style={{ backgroundColor: "var(--tpa-surface)", border: "1px solid var(--tpa-border)" }}>
                  max-w-md
                </code>{" "}
                внутри карточки.
              </p>
              <p>
                <strong style={{ color: "var(--tpa-text)" }}>Карточки:</strong> фон <code className="font-mono text-xs">--tpa-surface</code>, радиус 20px, бордер{" "}
                <code className="font-mono text-xs">--tpa-border</code>.
              </p>
              <p>
                <strong style={{ color: "var(--tpa-text)" }}>Фон секций:</strong> чередование <code className="font-mono text-xs">--tpa-bg</code> и <code className="font-mono text-xs">--tpa-surface</code> для ритма.
              </p>
            </div>
          </div>
        </section>

        <p className="text-center text-sm" style={{ color: "var(--tpa-muted)" }}>
          <Link href="/test-preview" className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--tpa-accent)" }}>
            ← Назад к хабу превью
          </Link>
        </p>
      </div>
    </div>
  );
}
