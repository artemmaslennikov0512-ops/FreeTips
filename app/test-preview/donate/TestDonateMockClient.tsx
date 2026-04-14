"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Radio, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const PRESETS = [100, 300, 500, 1000] as const;

type Props = {
  slug: string;
};

function displayNameForSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return "Стример";
  if (s.toLowerCase() === "demo") return "Демо-стример";
  return s.replace(/-/g, " ");
}

export function TestDonateMockClient({ slug }: Props) {
  const name = useMemo(() => displayNameForSlug(slug), [slug]);
  const [amountRub, setAmountRub] = useState<number>(300);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState<{ id: string } | null>(null);

  const applyCustom = () => {
    const n = Number(String(customValue).replace(",", ".").trim());
    if (!Number.isFinite(n) || n < 1) return;
    setAmountRub(Math.min(50000, Math.max(1, Math.round(n))));
    setCustomOpen(false);
  };

  const pay = () => {
    const id = `TEST-${Date.now().toString(36).toUpperCase()}`;
    setDone({ id });
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/test-preview" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] no-underline hover:text-[var(--color-text)]">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            К хабу превью
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Тестовый платёж засчитан</h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Деньги не списывались. Идентификатор: <span className="font-mono text-[var(--color-text)]">{done.id}</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setDone(null)}
              className="rounded-xl border border-[var(--color-dark-gray)]/25 bg-[var(--color-white)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)]"
            >
              Ещё раз
            </button>
            <Link
              href="/cabinet"
              className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-medium text-[#0a192f] no-underline"
            >
              Личный кабинет
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/test-preview" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] no-underline hover:text-[var(--color-text)]">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          К хабу превью
        </Link>
        <ThemeToggle />
      </div>

      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-white)] text-[var(--color-brand-gold)] ring-1 ring-[var(--color-dark-gray)]/20">
          <Radio className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Донат стримеру</p>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">{name}</h1>
          <p className="text-sm text-[var(--color-muted)]">Тестовая страница · без реальной оплаты</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-dark-gray)]/20 bg-[var(--color-white)] p-5 shadow-[var(--shadow-subtle)]">
        <p className="text-sm font-medium text-[var(--color-text)]">Сумма</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setAmountRub(v);
                setCustomOpen(false);
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                !customOpen && amountRub === v
                  ? "border-[var(--color-brand-gold)] bg-[var(--color-brand-gold)]/15 text-[var(--color-text)]"
                  : "border-[var(--color-dark-gray)]/25 bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-brand-gold)]/45"
              }`}
            >
              {v} ₽
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen((o) => !o)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              customOpen ? "border-[var(--color-brand-gold)] bg-[var(--color-brand-gold)]/15" : "border-[var(--color-dark-gray)]/25 bg-[var(--color-bg)]"
            }`}
          >
            Своя
          </button>
        </div>
        {customOpen ? (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Например 750"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[var(--color-dark-gray)]/25 bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]"
            />
            <button type="button" onClick={applyCustom} className="shrink-0 rounded-xl bg-[var(--color-text)] px-3 py-2 text-sm font-medium text-[var(--color-bg)]">
              OK
            </button>
          </div>
        ) : null}

        <label className="mt-6 block">
          <span className="text-sm font-medium text-[var(--color-text)]">Сообщение (необязательно)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Поддержать эфир…"
            className="mt-2 w-full resize-y rounded-xl border border-[var(--color-dark-gray)]/25 bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]"
          />
          <span className="mt-1 block text-right text-xs text-[var(--color-muted)]">{message.length}/280</span>
        </label>

        <button
          type="button"
          onClick={pay}
          className="mt-6 w-full rounded-xl bg-[var(--color-brand-gold)] py-3 text-center text-sm font-semibold text-[#0a192f]"
        >
          Оплатить {amountRub} ₽ (заглушка)
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
        Публичный адрес в превью: <span className="font-mono">/test-preview/donate/{slug || "demo"}</span>
      </p>
    </div>
  );
}
