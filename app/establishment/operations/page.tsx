"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import type { EstablishmentOperationsModule } from "@/lib/establishment-operations-modules";

interface OperationsResponse {
  modules: EstablishmentOperationsModule[];
  counts: { halls: number; tables: number };
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
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof payload?.error === "string"
              ? payload.error
              : "Не удалось загрузить разделы";
          const hint = typeof payload?.hint === "string" ? ` ${payload.hint}` : "";
          setError(msg + hint);
          return;
        }
        setData(payload);
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">{error ?? "Нет данных"}</div>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="min-w-0">
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-white">
          Операции
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Разделы зала и сервиса. Сейчас доступны залы и столы; бронь, гости, меню и оплата подключим
          следующими шагами.
        </p>
      </div>

      <div className="grid gap-3 rounded-[10px] border border-white/10 bg-[var(--color-bg-sides)]/80 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div className="flex items-center gap-3 text-white/90">
          <Layers className="h-5 w-5 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Заведено</p>
            <p className="text-lg font-medium tabular-nums text-white">
              {data.counts.halls} зал{data.counts.halls === 1 ? "" : data.counts.halls < 5 ? "а" : "ов"},{" "}
              {data.counts.tables} стол{data.counts.tables === 1 ? "" : data.counts.tables < 5 ? "а" : "ов"}
            </p>
          </div>
        </div>
        <div className="flex items-center sm:justify-end">
          <Link
            href="/establishment/halls"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/40 bg-[#0a192f]/20 px-4 py-2.5 text-sm font-medium text-[var(--color-brand-gold)] transition-colors hover:bg-[#0a192f]/35"
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
            className={`min-w-0 rounded-[10px] border p-4 shadow-[var(--shadow-subtle)] ${
              m.implemented
                ? "border-[var(--color-brand-gold)]/25 bg-[var(--color-bg-sides)]"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-medium text-white">{m.title}</h2>
                <p className="mt-1 text-sm text-white/70">{m.description}</p>
                {m.apiBase && (
                  <p className="mt-2 truncate font-mono text-xs text-white/40" title={m.apiBase}>
                    {m.apiBase}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${
                  m.implemented ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/60"
                }`}
              >
                {m.implemented ? "Готово" : "Скоро"}
              </span>
            </div>
            {m.implemented && m.cabinetPath ? (
              <Link
                href={m.cabinetPath}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-gold)] hover:underline"
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
