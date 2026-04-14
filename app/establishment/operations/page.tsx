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
          Залы, столы и бронь; дальше — гости, меню и сессии обслуживания. Оплату настроим отдельно.
        </p>
      </div>

      <div className="flex w-full max-w-full flex-col gap-2 self-stretch rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--establishment-charcoal)] px-3 py-3 shadow-[var(--shadow-subtle)] sm:px-4 sm:py-3.5">
        <div className="flex min-h-0 w-full max-w-xl flex-1 flex-col items-center gap-2 self-center text-center text-[var(--color-on-dark)]">
          <Layers className="h-5 w-5 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
          <div className="flex flex-col items-center gap-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--color-on-dark-muted)]">
              Сводка
            </p>
            <p className="text-base font-medium tabular-nums text-[var(--color-on-dark)]">
              {data.counts.halls} зал{data.counts.halls === 1 ? "" : data.counts.halls < 5 ? "а" : "ов"},{" "}
              {data.counts.tables} стол{data.counts.tables === 1 ? "" : data.counts.tables < 5 ? "а" : "ов"}
            </p>
            <div className="mt-1 flex w-full justify-center px-1">
              <table className="w-full max-w-[18.5rem] border-collapse text-left text-xs leading-snug text-[var(--color-on-dark-muted)] sm:text-sm sm:leading-snug">
                <caption className="sr-only">Сводка показателей по заведению</caption>
                <tbody>
                  {(
                    [
                      ["Предстоящих броней", data.counts.bookings],
                      ["Гостей в базе", data.counts.guests],
                      ["Позиций меню", data.counts.menuItems],
                      ["Открытых сессий стола", data.counts.openServiceSessions],
                    ] as const
                  ).map(([label, value]) => (
                    <tr key={label} className="border-b border-white/[0.08] last:border-b-0">
                      <td className="py-1.5 pr-3 align-middle">{label}</td>
                      <td className="py-1.5 text-right align-middle font-semibold tabular-nums text-[var(--color-on-dark)]">
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="flex w-full shrink-0 justify-end border-t border-[var(--color-brand-gold)]/20 pt-2">
          <Link
            href="/establishment/halls"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3.5 py-2 text-sm font-semibold text-[#0a192f] shadow-[var(--shadow-button)] transition-opacity hover:opacity-90"
          >
            Залы и столы
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      <ul
        className="grid min-w-0 w-full items-stretch gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9.75rem), 1fr))" }}
      >
        {data.modules.map((m) => {
          const clickable = Boolean(m.implemented && m.cabinetPath);
          const shell =
            "relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-md border border-[var(--color-brand-gold)]/25 bg-[var(--establishment-charcoal)] px-2 py-1.5 shadow-sm transition-all duration-200 ease-out";
          const implementedAccent = m.implemented ? "ring-1 ring-emerald-500/15" : "";
          const hoverable =
            "hover:-translate-y-0.5 hover:border-[var(--color-brand-gold)]/45 hover:bg-[#12141a] hover:shadow-md hover:shadow-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-gold)]/40";

          const body = (
            <>
              <div className="flex min-w-0 items-start justify-between gap-1">
                <h2 className="min-w-0 flex-1 text-left text-xs font-semibold leading-snug text-[var(--color-on-dark)]">
                  {m.title}
                </h2>
                <span
                  className={`shrink-0 rounded px-1 py-px text-[8px] font-semibold uppercase tracking-wide ${
                    m.implemented
                      ? "bg-emerald-500/30 text-emerald-50"
                      : "bg-white/10 text-[var(--color-on-dark-muted)]"
                  }`}
                >
                  {m.implemented ? "Готово" : "Скоро"}
                </span>
              </div>
              <p className="mt-0.5 min-h-0 flex-1 text-left text-[10px] leading-snug text-[var(--color-on-dark-muted)]">
                {m.description}
              </p>
              {m.apiBase || clickable ? (
                <div className="mt-1 flex min-w-0 flex-col gap-0.5 border-t border-white/[0.06] pt-1">
                  {m.apiBase ? (
                    <p
                      className="max-w-full truncate font-mono text-[9px] leading-tight text-[var(--color-on-dark-muted)]/75"
                      title={m.apiBase}
                    >
                      {m.apiBase}
                    </p>
                  ) : null}
                  {clickable ? (
                    <div className="flex items-center justify-end gap-0.5 text-[10px] font-semibold text-[var(--color-brand-gold)] group-hover:underline">
                      Открыть
                      <ArrowRight className="h-2 w-2 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          );

          return (
            <li key={m.id} className="flex min-h-0 min-w-0">
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
