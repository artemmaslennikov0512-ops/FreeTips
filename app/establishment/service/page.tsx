"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface TableOption {
  id: string;
  label: string;
  hallName: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface ServiceSession {
  id: string;
  tableId: string;
  employeeId: string | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  tableLabel: string;
  employeeName: string | null;
}

export default function EstablishmentServicePage() {
  const [sessions, setSessions] = useState<ServiceSession[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableId, setTableId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [opening, setOpening] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, hallRes, empRes] = await Promise.all([
        fetch("/api/establishment/service-sessions", { headers: authHeaders() }),
        fetch("/api/establishment/halls", { headers: authHeaders() }),
        fetch("/api/establishment/employees", { headers: authHeaders() }),
      ]);
      const sessData = await sessRes.json().catch(() => ({}));
      if (!sessRes.ok) {
        setError(sessData?.error ?? "Ошибка сессий");
        setSessions([]);
      } else {
        setSessions(sessData.sessions ?? []);
      }
      const hallData = await hallRes.json().catch(() => ({}));
      const opts: TableOption[] = [];
      if (hallRes.ok) {
        for (const h of hallData.halls ?? []) {
          for (const t of h.tables ?? []) {
            opts.push({ id: t.id, label: t.label, hallName: h.name });
          }
        }
      }
      setTables(opts);
      const empData = await empRes.json().catch(() => ({}));
      if (empRes.ok) {
        setEmployees((empData.employees ?? []).map((e: { id: string; name: string; isActive: boolean }) => e));
      } else {
        setEmployees([]);
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openSessions = sessions.filter((s) => s.status === "OPEN");
  const closedSessions = sessions.filter((s) => s.status !== "OPEN");

  const openSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableId) return;
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/establishment/service-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          tableId,
          employeeId: employeeId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось открыть сессию");
        return;
      }
      setTableId("");
      setEmployeeId("");
      await loadAll();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setOpening(false);
    }
  };

  const closeSession = async (id: string) => {
    try {
      const res = await fetch(`/api/establishment/service-sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      await loadAll();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const activeEmployees = employees.filter((e) => e.isActive);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-3">
      <div className="ft-panel-section-head min-w-0">
        <Link
          href="/establishment/operations"
          className="inline-flex items-center justify-center gap-1 text-sm text-[var(--color-on-dark-muted)] hover:text-[var(--color-on-dark)]"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Зал и сервис
        </Link>
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-[var(--color-on-dark)]">
          Сервис стола
        </h1>
        <p className="ft-panel-section-head__lead text-sm text-[var(--color-on-dark-muted)]">
          Открытая сессия на стол — одна; закройте перед новой. Оплата и чек — позже.
        </p>
      </div>
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-center text-red-100">
          <span>{error}</span>
          <button type="button" className="underline" onClick={() => setError(null)}>
            Скрыть
          </button>
        </div>
      ) : null}
      <form
        onSubmit={openSession}
        className="ft-panel-section-toolbar ft-panel-section-toolbar--row gap-2 rounded-lg border border-[var(--color-brand-gold)]/30 bg-white/[0.06] p-2.5 sm:flex-wrap"
      >
        <div className="w-full max-w-xs min-w-[12rem] flex-1 text-center sm:text-left">
          <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Стол *</label>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-[#0a192f]/30 px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
          >
            <option value="">Выберите стол</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.hallName} · стол {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full max-w-xs min-w-[12rem] flex-1 text-center sm:text-left">
          <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Официант (необяз.)</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-[#0a192f]/30 px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
          >
            <option value="">Не указан</option>
            {activeEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={opening || !tableId}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs font-semibold text-[#0a192f] disabled:opacity-40"
        >
          Открыть сессию
        </button>
      </form>
      {loading ? (
        <p className="text-center text-[var(--color-on-dark-muted)]">Загрузка…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-gold)]">
              Открытые
            </h2>
            {openSessions.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-on-dark-muted)]">Нет открытых сессий.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {openSessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.06] p-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-on-dark)]">{s.tableLabel}</p>
                      <p className="text-xs text-[var(--color-on-dark-muted)]">
                        {s.employeeName ? `Официант: ${s.employeeName}` : "Официант не указан"} · с{" "}
                        {new Date(s.openedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => closeSession(s.id)}
                      className="rounded-lg border border-[var(--color-brand-gold)]/40 px-2.5 py-1 text-xs text-[var(--color-on-dark)] hover:bg-white/10"
                    >
                      Закрыть
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--color-on-dark-muted)]">
              Недавние (все статусы)
            </h2>
            <ul className="flex max-h-[24rem] flex-col gap-1 overflow-y-auto text-xs">
              {closedSessions.slice(0, 50).map((s) => (
                <li key={s.id} className="rounded-md border border-[var(--color-brand-gold)]/15 bg-white/[0.04] px-2 py-1.5 text-[var(--color-on-dark-muted)]">
                  {s.tableLabel} · {s.status === "CLOSED" ? "закрыта" : s.status}
                  {s.closedAt ? ` · ${new Date(s.closedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}` : ""}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
