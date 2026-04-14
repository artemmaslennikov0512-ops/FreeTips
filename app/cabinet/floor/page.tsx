"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authHeaders } from "@/lib/auth-client";

interface FloorTable {
  id: string;
  label: string;
  capacity: number;
  hallName: string;
  openSession: {
    id: string;
    employeeId: string | null;
    employeeName: string | null;
    mySession: boolean;
    order: { id: string; status: string; totalKop: string; lineCount: number } | null;
  } | null;
}

interface FloorHall {
  id: string;
  name: string;
  tables: FloorTable[];
}

export default function CabinetFloorPage() {
  const [halls, setHalls] = useState<FloorHall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cabinet/establishment/floor", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось загрузить зал");
        setHalls([]);
        return;
      }
      setHalls(data.halls ?? []);
    } catch {
      setError("Ошибка соединения");
      setHalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Зал</h1>
        <p className="mt-1 text-sm text-[var(--color-text)]/70">
          Выберите стол, откройте обслуживание и соберите заказ из меню заведения.
        </p>
      </div>
      {error ? (
        <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("не привязан") ? (
            <p className="mt-2 text-[var(--color-text)]/80">
              Подключитесь к заведению через приглашение от управляющего.
            </p>
          ) : null}
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-[var(--color-text)]/70">Загрузка…</p>
      ) : halls.length === 0 ? (
        <p className="text-sm text-[var(--color-text)]/70">
          Залы и столы ещё не настроены. Попросите управляющего добавить их в кабинете заведения.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {halls.map((h) => (
            <section key={h.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-brand-gold)]">
                {h.name}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {h.tables.map((t) => {
                  const occ = t.openSession;
                  const busyOther = occ && !occ.mySession;
                  const mine = occ && occ.mySession;
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/cabinet/floor/${t.id}`}
                        className={`flex flex-col rounded-lg border px-4 py-3 transition-colors ${
                          busyOther
                            ? "border-amber-400/35 bg-amber-500/10 hover:bg-amber-500/15"
                            : mine
                              ? "border-emerald-400/35 bg-emerald-500/10 hover:bg-emerald-500/15"
                              : "border-[var(--color-brand-gold)]/25 bg-[var(--color-dark-gray)]/10 hover:bg-[var(--color-dark-gray)]/20"
                        }`}
                      >
                        <span className="font-medium text-[var(--color-text)]">
                          Стол {t.label}
                          <span className="ml-2 text-xs font-normal text-[var(--color-text)]/60">до {t.capacity}</span>
                        </span>
                        {busyOther ? (
                          <span className="mt-1 text-xs text-amber-100/90">Занят коллегой</span>
                        ) : mine ? (
                          <span className="mt-1 text-xs text-emerald-100/90">
                            Ваш стол
                            {occ.order ? ` · ${(Number(occ.order.totalKop) / 100).toLocaleString("ru-RU")} ₽` : ""}
                          </span>
                        ) : (
                          <span className="mt-1 text-xs text-[var(--color-text)]/55">Свободен</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
