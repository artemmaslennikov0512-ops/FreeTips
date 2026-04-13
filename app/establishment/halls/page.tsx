"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, ChevronLeft } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface TableRow {
  id: string;
  hallId: string;
  label: string;
  capacity: number;
  sortOrder: number;
  externalCode: string | null;
}

interface HallRow {
  id: string;
  name: string;
  sortOrder: number;
  tables: TableRow[];
}

export default function EstablishmentHallsPage() {
  const [halls, setHalls] = useState<HallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newHallName, setNewHallName] = useState("");
  const [creatingHall, setCreatingHall] = useState(false);

  const [tableForms, setTableForms] = useState<
    Record<string, { label: string; capacity: string; externalCode: string }>
  >({});

  const [editingHallId, setEditingHallId] = useState<string | null>(null);
  const [editHallName, setEditHallName] = useState("");
  const [savingHallId, setSavingHallId] = useState<string | null>(null);

  const [editingTable, setEditingTable] = useState<TableRow | null>(null);
  const [editTableLabel, setEditTableLabel] = useState("");
  const [editTableCapacity, setEditTableCapacity] = useState("2");
  const [editTableCode, setEditTableCode] = useState("");
  const [savingTable, setSavingTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/establishment/halls", { headers: authHeaders() });
      if (!res.ok) {
        setError("Не удалось загрузить залы");
        return;
      }
      const data = await res.json();
      setHalls(data.halls ?? []);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getTableForm = (hallId: string) =>
    tableForms[hallId] ?? { label: "", capacity: "2", externalCode: "" };

  const setTableForm = (
    hallId: string,
    patch: Partial<{ label: string; capacity: string; externalCode: string }>,
  ) => {
    setTableForms((prev) => ({
      ...prev,
      [hallId]: { ...getTableForm(hallId), ...patch },
    }));
  };

  const createHall = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newHallName.trim();
    if (!name) return;
    setCreatingHall(true);
    try {
      const res = await fetch("/api/establishment/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось создать зал");
        return;
      }
      setNewHallName("");
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setCreatingHall(false);
    }
  };

  const deleteHall = async (id: string) => {
    if (!confirm("Удалить зал и все столы в нём?")) return;
    try {
      const res = await fetch(`/api/establishment/halls/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка удаления");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const startEditHall = (h: HallRow) => {
    setEditingHallId(h.id);
    setEditHallName(h.name);
  };

  const saveHall = async (id: string) => {
    const name = editHallName.trim();
    if (!name) return;
    setSavingHallId(id);
    try {
      const res = await fetch(`/api/establishment/halls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось сохранить");
        return;
      }
      setEditingHallId(null);
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSavingHallId(null);
    }
  };

  const addTable = async (hallId: string, e: React.FormEvent) => {
    e.preventDefault();
    const f = getTableForm(hallId);
    const label = f.label.trim();
    if (!label) return;
    const capacity = Math.min(99, Math.max(1, parseInt(f.capacity, 10) || 2));
    try {
      const res = await fetch(`/api/establishment/halls/${hallId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          label,
          capacity,
          externalCode: f.externalCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось добавить стол");
        return;
      }
      setTableForm(hallId, { label: "", capacity: "2", externalCode: "" });
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm("Удалить стол?")) return;
    try {
      const res = await fetch(`/api/establishment/tables/${tableId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка удаления");
        return;
      }
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const startEditTable = (t: TableRow) => {
    setEditingTable(t);
    setEditTableLabel(t.label);
    setEditTableCapacity(String(t.capacity));
    setEditTableCode(t.externalCode ?? "");
  };

  const saveTable = async () => {
    if (!editingTable) return;
    const label = editTableLabel.trim();
    if (!label) return;
    const capacity = Math.min(99, Math.max(1, parseInt(editTableCapacity, 10) || 2));
    setSavingTable(true);
    try {
      const res = await fetch(`/api/establishment/tables/${editingTable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          label,
          capacity,
          externalCode: editTableCode.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось сохранить стол");
        return;
      }
      setEditingTable(null);
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSavingTable(false);
    }
  };

  if (loading) {
    return <div className="text-white/90">Загрузка…</div>;
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/establishment/operations"
          className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Операции
        </Link>
      </div>

      <div className="min-w-0">
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-white">
          Залы и столы
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Структура зала для будущей брони и привязки к официанту. Код стола (externalCode) можно
          заполнить под интеграцию с кассой позже.
        </p>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-sm underline hover:no-underline"
          >
            Скрыть
          </button>
        </div>
      ) : null}

      <form
        onSubmit={createHall}
        className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-white/10 bg-[var(--color-bg-sides)]/80 p-4 sm:flex-row sm:items-end"
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="new-hall" className="mb-1 block text-xs text-white/60">
            Новый зал
          </label>
          <input
            id="new-hall"
            value={newHallName}
            onChange={(e) => setNewHallName(e.target.value)}
            placeholder="Например, Основной зал"
            className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-white placeholder:text-white/35"
            maxLength={120}
          />
        </div>
        <button
          type="submit"
          disabled={creatingHall || !newHallName.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-medium text-[#0a192f] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Добавить зал
        </button>
      </form>

      {halls.length === 0 ? (
        <p className="text-sm text-white/60">Пока нет залов — добавьте первый.</p>
      ) : null}

      <div className="flex flex-col gap-4">
        {halls.map((hall) => (
          <section
            key={hall.id}
            className="min-w-0 rounded-[10px] border border-white/10 bg-[var(--color-bg-sides)]/60 p-4 sm:p-5"
          >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                {editingHallId === hall.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editHallName}
                      onChange={(e) => setEditHallName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-white"
                      maxLength={120}
                    />
                    <button
                      type="button"
                      onClick={() => saveHall(hall.id)}
                      disabled={savingHallId === hall.id}
                      className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingHallId(null)}
                      className="rounded-lg px-3 py-2 text-sm text-white/70 hover:text-white"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-medium text-white">{hall.name}</h2>
                    <button
                      type="button"
                      onClick={() => startEditHall(hall)}
                      className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                      aria-label="Переименовать зал"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteHall(hall.id)}
                      className="rounded-lg p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-200"
                      aria-label="Удалить зал"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="mt-1 text-xs text-white/45">
                  Столов: {hall.tables.length} · порядок сортировки: {hall.sortOrder}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {hall.tables.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-white">{t.label}</span>
                    <span className="ml-2 text-sm text-white/55">до {t.capacity} гостей</span>
                    {t.externalCode ? (
                      <span className="ml-2 font-mono text-xs text-white/40">{t.externalCode}</span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEditTable(t)}
                      className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                      aria-label="Изменить стол"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTable(t.id)}
                      className="rounded-lg p-1.5 text-white/60 hover:bg-red-500/20 hover:text-red-200"
                      aria-label="Удалить стол"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <form
              onSubmit={(e) => addTable(hall.id, e)}
              className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-12 sm:items-end"
            >
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs text-white/60">Стол</label>
                <input
                  value={getTableForm(hall.id).label}
                  onChange={(e) => setTableForm(hall.id, { label: e.target.value })}
                  placeholder="№ или название"
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-sm text-white"
                  maxLength={80}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-white/60">Мест</label>
                <input
                  value={getTableForm(hall.id).capacity}
                  onChange={(e) => setTableForm(hall.id, { capacity: e.target.value })}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs text-white/60">Код для кассы (необяз.)</label>
                <input
                  value={getTableForm(hall.id).externalCode}
                  onChange={(e) => setTableForm(hall.id, { externalCode: e.target.value })}
                  placeholder="POS / UUID"
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-sm text-white"
                  maxLength={64}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!getTableForm(hall.id).label.trim()}
                  className="flex w-full items-center justify-center gap-1 rounded-xl border border-[var(--color-brand-gold)]/50 py-2 text-sm font-medium text-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/10 disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Стол
                </button>
              </div>
            </form>
          </section>
        ))}
      </div>

      {editingTable ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="edit-table-title"
        >
          <div className="w-full max-w-md rounded-[10px] border border-white/15 bg-[var(--color-bg)] p-5 shadow-2xl">
            <h3 id="edit-table-title" className="text-lg font-medium text-white">
              Стол
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Обозначение</label>
                <input
                  value={editTableLabel}
                  onChange={(e) => setEditTableLabel(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-white"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Мест</label>
                <input
                  value={editTableCapacity}
                  onChange={(e) => setEditTableCapacity(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Код для кассы</label>
                <input
                  value={editTableCode}
                  onChange={(e) => setEditTableCode(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-[#0a192f]/25 px-3 py-2 text-white"
                  maxLength={64}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingTable(null)}
                className="rounded-lg px-4 py-2 text-sm text-white/80 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={saveTable}
                disabled={savingTable || !editTableLabel.trim()}
                className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-medium text-[#0a192f] disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
