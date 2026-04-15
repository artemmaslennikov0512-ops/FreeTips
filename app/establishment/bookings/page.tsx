"use client";

import { useCallback, useEffect, useState } from "react";
import { useMobileDarkChromeOverlay } from "@/lib/use-mobile-dark-chrome-overlay";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Pencil } from "lucide-react";
import { fetchWithAuth } from "@/lib/auth-client";
import { todayYmdMoscow } from "@/lib/establishment-booking-moscow";
import { EstablishmentDataGridPlaceholder } from "@/components/establishment/EstablishmentDataGridPlaceholder";
import { PANEL_PAGE_TITLE_ESTABLISHMENT_HERO_ON_DARK } from "@/lib/panel-shell-visual-classes";

type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SEATED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Ожидает",
  CONFIRMED: "Подтверждена",
  SEATED: "За столом",
  COMPLETED: "Завершена",
  NO_SHOW: "Не пришли",
  CANCELLED: "Отменена",
};

interface TableOption {
  id: string;
  label: string;
  capacity: number;
  hallName: string;
}

interface BookingRow {
  id: string;
  guestId: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  partySize: number;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  notes: string | null;
  table: { id: string; label: string; capacity: number; hallName: string } | null;
  guest: { id: string; displayName: string } | null;
}

interface GuestOption {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
}

function formatMoscowTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoscowDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "short",
  });
}

export default function EstablishmentBookingsPage() {
  const [dateYmd, setDateYmd] = useState(todayYmdMoscow);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);
  const [guestOptions, setGuestOptions] = useState<GuestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formGuestId, setFormGuestId] = useState("");
  const [formGuest, setFormGuest] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formParty, setFormParty] = useState("2");
  const [formTableId, setFormTableId] = useState("");
  const [formStart, setFormStart] = useState("19:00");
  const [formEnd, setFormEnd] = useState("21:00");
  const [formNotes, setFormNotes] = useState("");

  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [editStatus, setEditStatus] = useState<BookingStatus>("PENDING");
  const [savingEdit, setSavingEdit] = useState(false);

  useMobileDarkChromeOverlay(showForm || editing !== null);

  const loadTables = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/establishment/halls");
      if (!res.ok) return;
      const data = await res.json();
      const halls = data.halls ?? [];
      const opts: TableOption[] = [];
      for (const h of halls) {
        for (const t of h.tables ?? []) {
          opts.push({
            id: t.id,
            label: t.label,
            capacity: t.capacity,
            hallName: h.name,
          });
        }
      }
      setTableOptions(opts);
    } catch {
      /* ignore */
    }
  }, []);

  const loadGuests = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/establishment/guests");
      if (!res.ok) return;
      const data = await res.json();
      setGuestOptions(data.guests ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadBookings = useCallback(async (ymd: string) => {
    setLoading(true);
    setError(null);
    try {
      const q = ymd ? `?date=${encodeURIComponent(ymd)}` : "";
      const res = await fetchWithAuth(`/api/establishment/bookings${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось загрузить брони");
        setBookings([]);
        return;
      }
      setDateYmd(data.date ?? ymd);
      setBookings(data.bookings ?? []);
    } catch {
      setError("Ошибка соединения");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    loadGuests();
  }, [loadTables, loadGuests]);

  useEffect(() => {
    loadBookings(dateYmd || "");
  }, [dateYmd, loadBookings]);

  const openCreate = () => {
    setFormGuestId("");
    setFormGuest("");
    setFormPhone("");
    setFormEmail("");
    setFormParty("2");
    setFormTableId(tableOptions[0]?.id ?? "");
    setFormStart("19:00");
    setFormEnd("21:00");
    setFormNotes("");
    setShowForm(true);
  };

  const createBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateYmd) return;
    if (!formGuestId && !formGuest.trim()) {
      setError("Укажите имя гостя или выберите карточку из базы");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/establishment/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(formGuestId ? { guestId: formGuestId } : {}),
          ...(formGuest.trim() ? { guestName: formGuest.trim() } : {}),
          guestPhone: formPhone.trim() || undefined,
          guestEmail: formEmail.trim() || undefined,
          partySize: Math.min(99, Math.max(1, parseInt(formParty, 10) || 1)),
          date: dateYmd,
          startTime: formStart,
          endTime: formEnd,
          tableId: formTableId || null,
          notes: formNotes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось создать бронь");
        return;
      }
      setShowForm(false);
      await loadBookings(dateYmd);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (b: BookingRow) => {
    setEditing(b);
    setEditStatus(b.status);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/establishment/bookings/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка сохранения");
        return;
      }
      setEditing(null);
      await loadBookings(dateYmd);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSavingEdit(false);
    }
  };

  const removeBooking = async (id: string) => {
    if (!confirm("Удалить бронь из списка?")) return;
    try {
      const res = await fetchWithAuth(`/api/establishment/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка удаления");
        return;
      }
      await loadBookings(dateYmd);
    } catch {
      setError("Ошибка соединения");
    }
  };

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
        <h1 className={PANEL_PAGE_TITLE_ESTABLISHMENT_HERO_ON_DARK}>
          Бронь
        </h1>
        <p className="ft-panel-section-head__lead text-sm text-[var(--color-on-dark-muted)]">
          Календарный день по Москве. Время начала и окончания — в часовом поясе Москвы (например, ужин 19:00–21:00).
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/15 px-4 py-3 text-center text-red-100">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-sm underline">
            Скрыть
          </button>
        </div>
      ) : null}

      <div className="ft-panel-section-toolbar gap-2 rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--establishment-charcoal)] p-2.5 shadow-[var(--shadow-subtle)]">
        <div className="flex min-w-0 flex-row flex-wrap items-end justify-center gap-3">
          <div className="text-center sm:text-left">
            <label htmlFor="booking-date" className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">
              Дата (МСК)
            </label>
            <input
              id="booking-date"
              type="date"
              value={dateYmd}
              onChange={(e) => {
                const v = e.target.value;
                setDateYmd(v);
                if (v) loadBookings(v);
              }}
              className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.08] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
            />
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={!dateYmd}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs font-semibold text-[#0a192f] shadow-[var(--shadow-button)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Новая бронь
          </button>
        </div>
        {tableOptions.length === 0 ? (
          <p className="min-w-0 max-w-xl text-center text-sm text-[var(--color-on-dark-muted)]">
            Сначала добавьте залы и столы в разделе{" "}
            <Link href="/establishment/halls" className="font-medium text-[var(--color-brand-gold)] underline">
              Залы и столы
            </Link>
            .
          </p>
        ) : null}
      </div>

      {loading ? (
        <EstablishmentDataGridPlaceholder
          loading
          rows={5}
          columns={[
            { label: "Время", colClassName: "min-w-[5.5rem]" },
            { label: "Гость", colClassName: "min-w-[6rem] sm:min-w-[8rem]" },
            { label: "Стол", colClassName: "min-w-[5rem]" },
            { label: "Статус", colClassName: "min-w-[4.5rem]" },
          ]}
          footerNote="Загрузка…"
        />
      ) : bookings.length === 0 ? (
        <EstablishmentDataGridPlaceholder
          rows={5}
          columns={[
            { label: "Время", colClassName: "min-w-[5.5rem]" },
            { label: "Гость", colClassName: "min-w-[6rem] sm:min-w-[8rem]" },
            { label: "Стол", colClassName: "min-w-[5rem]" },
            { label: "Статус", colClassName: "min-w-[4.5rem]" },
          ]}
          footerNote={
            tableOptions.length === 0
              ? "Сначала добавьте залы и столы — затем здесь появятся брони на выбранный день."
              : "На этот день броней нет."
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="rounded-lg border border-[var(--color-brand-gold)]/30 bg-[var(--establishment-charcoal)] p-2.5 shadow-[var(--shadow-subtle)]"
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-on-dark)]">{b.guestName}</p>
                  {b.guest ? (
                    <p className="mt-0.5 text-xs text-[var(--color-brand-gold)]">Карточка: {b.guest.displayName}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-[var(--color-on-dark-muted)]">
                    {formatMoscowDate(b.startsAt)} · {formatMoscowTime(b.startsAt)} — {formatMoscowTime(b.endsAt)} ·{" "}
                    {b.partySize}{" "}
                    {b.partySize === 1 ? "гость" : b.partySize < 5 ? "гостя" : "гостей"}
                  </p>
                  {b.table ? (
                    <p className="mt-1 text-xs text-[var(--color-on-dark-muted)]">
                      {b.table.hallName} · стол {b.table.label} (до {b.table.capacity})
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--color-on-dark-muted)]">Без привязки к столу</p>
                  )}
                  {(b.guestPhone || b.guestEmail) && (
                    <p className="mt-1 text-xs text-[var(--color-on-dark-muted)]">
                      {[b.guestPhone, b.guestEmail].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {b.notes ? (
                    <p className="mt-1.5 text-xs text-[var(--color-on-dark-muted)]">{b.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="rounded-md bg-white/12 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-on-dark)]">
                    {STATUS_LABEL[b.status]}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="rounded-lg p-1.5 text-[var(--color-on-dark-muted)] hover:bg-white/10 hover:text-[var(--color-on-dark)]"
                      aria-label="Статус"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBooking(b.id)}
                      className="rounded-lg p-1.5 text-[var(--color-on-dark-muted)] hover:bg-red-500/25 hover:text-red-100"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="new-booking-title"
        >
          <form
            onSubmit={createBooking}
            className="establishment-dialog w-full max-w-md rounded-lg border border-[var(--color-brand-gold)]/35 p-4 shadow-2xl"
          >
            <h3 id="new-booking-title" className="text-sm font-medium text-[var(--color-on-dark)]">
              Новая бронь
            </h3>
            <p className="mt-1 text-xs text-[var(--color-on-dark-muted)]">Дата: {dateYmd} (МСК)</p>
            <div className="mt-3 grid gap-2">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Гость из базы</label>
                <select
                  value={formGuestId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormGuestId(id);
                    const g = guestOptions.find((x) => x.id === id);
                    if (g) {
                      setFormGuest(g.displayName);
                      setFormPhone(g.phone ?? "");
                      setFormEmail(g.email ?? "");
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                >
                  <option value="">Не выбрано</option>
                  {guestOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">
                  Имя для брони {!formGuestId ? "*" : ""}
                </label>
                <input
                  value={formGuest}
                  onChange={(e) => setFormGuest(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  maxLength={120}
                  placeholder={formGuestId ? "По умолчанию из карточки" : ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Начало</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Конец</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Стол</label>
                <select
                  value={formTableId}
                  onChange={(e) => setFormTableId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                >
                  <option value="">Без стола</option>
                  {tableOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.hallName} · стол {t.label} (до {t.capacity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Гостей</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formParty}
                  onChange={(e) => setFormParty(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Телефон</label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  maxLength={40}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  maxLength={255}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-on-dark-muted)]">Заметка</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--color-on-dark-muted)] hover:text-[var(--color-on-dark)]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[var(--color-brand-gold)] px-3 py-1.5 text-xs font-semibold text-[#0a192f] disabled:opacity-50"
              >
                Создать
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editing ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal
        >
          <div className="establishment-dialog w-full max-w-sm rounded-lg border border-[var(--color-brand-gold)]/35 p-4 shadow-2xl">
            <h3 className="text-sm font-medium text-[var(--color-on-dark)]">Статус брони</h3>
            <p className="mt-1 text-sm text-[var(--color-on-dark-muted)]">{editing.guestName}</p>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as BookingStatus)}
              className="mt-3 w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)]"
            >
              {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-md px-3 py-1.5 text-xs text-[var(--color-on-dark-muted)]"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-lg bg-[var(--color-brand-gold)] px-3 py-1.5 text-xs font-semibold text-[#0a192f] disabled:opacity-50"
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
