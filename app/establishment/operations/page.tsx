"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import type { EstablishmentOperationsModule } from "@/lib/establishment-operations-modules";

interface OperationsResponse {
  modules: EstablishmentOperationsModule[];
  counts: {
    halls: number;
    tables: number;
    bookings: number;
    guests: number;
    menuItems: number;
    openServiceSessions: number;
  };
}

export default function EstablishmentOperationsPage() {
  const [data, setData] = useState<OperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/establishment/operations", { headers: authHeaders() });
        const text = await res.text();
        let payload: {
          error?: string;
          hint?: string;
          modules?: EstablishmentOperationsModule[];
          counts?: {
            halls: number;
            tables: number;
            bookings?: number;
            guests?: number;
            menuItems?: number;
            openServiceSessions?: number;
          };
        } = {};
        try {
          if (text.trim()) payload = JSON.parse(text) as typeof payload;
        } catch {
          /* тело не JSON (часто HTML 404 от nginx или старая сборка) */
        }

        if (!res.ok) {
          const bits: string[] = [];
          if (typeof payload.error === "string") bits.push(payload.error);
          else {
            bits.push(`HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`);
            if (!text.trim().startsWith("{")) {
              bits.push(
                "Ответ не JSON — часто это 404 от прокси или на сервере нет маршрута /api/establishment/operations (нужен деплой актуального кода).",
              );
            }
          }
          if (typeof payload.hint === "string") bits.push(payload.hint);
          setError(bits.join(" "));
          return;
        }

        if (!Array.isArray(payload.modules) || !payload.counts) {
          setError("Сервер вернул неожиданный формат данных.");
          return;
        }
        setData({
          modules: payload.modules,
          counts: {
            halls: Number(payload.counts.halls) || 0,
            tables: Number(payload.counts.tables) || 0,
            bookings: Number(payload.counts.bookings) || 0,
            guests: Number(payload.counts.guests) || 0,
            menuItems: Number(payload.counts.menuItems) || 0,
            openServiceSessions: Number(payload.counts.openServiceSessions) || 0,
          },
        });
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-[var(--color-on-dark-muted)]">Загрузка…</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-2 text-red-100">
        {error ?? "Нет данных"}
      </div>
    );
  }

  /* Классы целиком в разметке — чтобы Tailwind не выбросил их из бандла */
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="min-w-0">
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-[var(--color-on-dark)]">
          Зал и сервис
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-on-dark-muted)]">
          Залы, столы и бронь; дальше — гости, меню и сервис стола. Оплату настроим отдельно.
        </p>
      </div>

      <div className="grid gap-3 rounded-[10px] border border-[var(--color-brand-gold)]/30 bg-white/[0.06] px-4 py-4 shadow-[var(--shadow-subtle)] backdrop-blur-sm sm:grid-cols-2 sm:px-5">
        <div className="flex items-center gap-3 text-[var(--color-on-dark)]">
          <Layers className="h-5 w-5 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-on-dark-muted)]">Заведено</p>
            <p className="text-lg font-medium tabular-nums text-[var(--color-on-dark)]">
              {data.counts.halls} зал{data.counts.halls === 1 ? "" : data.counts.halls < 5 ? "а" : "ов"},{" "}
              {data.counts.tables} стол{data.counts.tables === 1 ? "" : data.counts.tables < 5 ? "а" : "ов"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-on-dark-muted)]">
              Предстоящих броней: {data.counts.bookings} · гостей в базе: {data.counts.guests} · позиций меню:{" "}
              {data.counts.menuItems} · открытых сессий стола: {data.counts.openServiceSessions}
            </p>
          </div>
        </div>
        <div className="flex items-center sm:justify-end">
          <Link
            href="/establishment/halls"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] shadow-[var(--shadow-button)] transition-opacity hover:opacity-90"
          >
            Залы и столы
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
        {data.modules.map((m) => (
          <li
            key={m.id}
            className={`min-w-0 rounded-[10px] border border-[var(--color-brand-gold)]/30 bg-white/[0.06] p-4 shadow-[var(--shadow-subtle)] backdrop-blur-sm ${
              m.implemented ? "ring-1 ring-[var(--color-brand-gold)]/25" : ""
            }`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-medium text-[var(--color-on-dark)]">{m.title}</h2>
                <p className="mt-1 text-sm text-[var(--color-on-dark-muted)]">{m.description}</p>
                {m.apiBase && (
                  <p
                    className="mt-2 truncate font-mono text-xs text-[var(--color-on-dark-muted)] opacity-80"
                    title={m.apiBase}
                  >
                    {m.apiBase}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                  m.implemented
                    ? "bg-emerald-500/35 text-emerald-50"
                    : "bg-white/12 text-[var(--color-on-dark-muted)]"
                }`}
              >
                {m.implemented ? "Готово" : "Скоро"}
              </span>
            </div>
            {m.implemented && m.cabinetPath ? (
              <Link
                href={m.cabinetPath}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-gold)] underline-offset-2 hover:underline"
              >
                Открыть
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
