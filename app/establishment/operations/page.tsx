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
    return (
      <div className="flex min-h-[min(40vh,20rem)] w-full flex-col items-center justify-center text-center text-[var(--color-on-dark-muted)]">
        Загрузка…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[min(40vh,20rem)] w-full flex-col items-center justify-center px-4 text-center">
        <div className="max-w-lg rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-red-100">
          {error ?? "Нет данных"}
        </div>
      </div>
    );
  }

  /* Классы целиком в разметке — чтобы Tailwind не выбросил их из бандла */
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <div className="ft-panel-section-head min-w-0">
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-[var(--color-on-dark)]">
          Зал и сервис
        </h1>
        <p className="ft-panel-section-head__lead text-sm text-[var(--color-on-dark-muted)]">
          Залы, столы и бронь; дальше — гости, меню и сервис стола. Оплату настроим отдельно.
        </p>
      </div>

      <div className="ft-panel-section-toolbar ft-panel-section-toolbar--row gap-2 rounded-lg border border-[var(--color-brand-gold)]/30 bg-white/[0.06] px-3 py-2.5 shadow-[var(--shadow-subtle)] backdrop-blur-sm sm:px-4">
        <div className="flex max-w-xl flex-col items-center gap-1.5 text-center text-[var(--color-on-dark)] sm:items-center">
          <Layers className="h-4 w-4 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
          <div className="flex flex-col items-center gap-0.5">
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-on-dark-muted)]">Заведено</p>
            <p className="text-sm font-medium tabular-nums text-[var(--color-on-dark)]">
              {data.counts.halls} зал{data.counts.halls === 1 ? "" : data.counts.halls < 5 ? "а" : "ов"},{" "}
              {data.counts.tables} стол{data.counts.tables === 1 ? "" : data.counts.tables < 5 ? "а" : "ов"}
            </p>
            <p className="text-xs text-[var(--color-on-dark-muted)]">
              Предстоящих броней: {data.counts.bookings} · гостей в базе: {data.counts.guests} · позиций меню:{" "}
              {data.counts.menuItems} · открытых сессий стола: {data.counts.openServiceSessions}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-center">
          <Link
            href="/establishment/halls"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs font-semibold text-[#0a192f] shadow-[var(--shadow-button)] transition-opacity hover:opacity-90"
          >
            Залы и столы
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>

      <ul className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.modules.map((m) => {
          const clickable = Boolean(m.implemented && m.cabinetPath);
          const shell =
            "relative block min-h-0 w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.05] p-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out";
          const implementedAccent = m.implemented ? "ring-1 ring-emerald-500/15" : "";
          const hoverable =
            "hover:-translate-y-0.5 hover:border-[var(--color-brand-gold)]/45 hover:bg-white/[0.09] hover:shadow-md hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/40";

          const body = (
            <>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h2 className="min-w-0 flex-1 text-left text-sm font-semibold leading-snug text-[var(--color-on-dark)]">
                  {m.title}
                </h2>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    m.implemented
                      ? "bg-emerald-500/30 text-emerald-50"
                      : "bg-white/10 text-[var(--color-on-dark-muted)]"
                  }`}
                >
                  {m.implemented ? "Готово" : "Скоро"}
                </span>
              </div>
              <p className="mt-1.5 text-left text-xs leading-relaxed text-[var(--color-on-dark-muted)]">{m.description}</p>
              {m.apiBase ? (
                <p
                  className="mt-2 max-w-full truncate font-mono text-[10px] leading-tight text-[var(--color-on-dark-muted)]/75"
                  title={m.apiBase}
                >
                  {m.apiBase}
                </p>
              ) : null}
              {clickable ? (
                <div className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-[var(--color-brand-gold)] group-hover:underline">
                  Открыть
                  <ArrowRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </div>
              ) : null}
            </>
          );

          return (
            <li key={m.id} className="min-w-0">
              {clickable && m.cabinetPath ? (
                <Link
                  href={m.cabinetPath}
                  aria-label={`Открыть раздел: ${m.title}`}
                  className={`group ${shell} ${implementedAccent} ${hoverable}`}
                >
                  {body}
                </Link>
              ) : (
                <div className={`${shell} ${implementedAccent} cursor-not-allowed opacity-70`}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
