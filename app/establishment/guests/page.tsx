"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Pencil } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface GuestRow {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export default function EstablishmentGuestsPage() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<GuestRow | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = q.trim() ? `/api/establishment/guests?q=${encodeURIComponent(q.trim())}` : "/api/establishment/guests";
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Ошибка загрузки");
        return;
      }
      setGuests(data.guests ?? []);
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => load(), q.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const createGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/establishment/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          displayName: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Не удалось создать");
        return;
      }
      setShowForm(false);
      setName("");
      setPhone("");
      setEmail("");
      setNotes("");
      await load();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setSubmitting(false);
    }
  };

  const saveNotes = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/establishment/guests/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ notes: editNotes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка");
        return;
      }
      setEditing(null);
      await load();
    } catch {
      setError("Ошибка соединения");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Удалить гостя? Связь с бронями обнулится.")) return;
    try {
      const res = await fetch(`/api/establishment/guests/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Ошибка");
        return;
      }
      await load();
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
        <h1 className="cabinet-dashboard-name-hero font-[family:var(--font-playfair)] text-[var(--color-on-dark)]">
          Гости
        </h1>
        <p className="ft-panel-section-head__lead text-sm text-[var(--color-on-dark-muted)]">
          Карточки для броней и заметок. Поиск по имени, телефону или email.
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
      <div className="ft-panel-section-toolbar ft-panel-section-toolbar--row rounded-lg border border-[var(--color-brand-gold)]/30 bg-[#0d0e12] p-2.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск…"
          className="min-w-[11rem] w-56 max-w-full shrink rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.08] px-2.5 py-1.5 text-sm text-[var(--color-on-dark)] placeholder:text-[var(--color-on-dark-muted)] sm:w-64 sm:text-left"
        />
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-brand-gold)] px-3 py-2 text-xs font-semibold text-[#0a192f]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Добавить
        </button>
      </div>
      {loading ? (
        <p className="text-center text-[var(--color-on-dark-muted)]">Загрузка…</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {guests.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[var(--color-brand-gold)]/25 bg-[#0d0e12] p-2.5"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-on-dark)]">{g.displayName}</p>
                <p className="text-xs text-[var(--color-on-dark-muted)]">
                  {[g.phone, g.email].filter(Boolean).join(" · ") || "—"}
                </p>
                {g.notes ? <p className="mt-1.5 text-xs text-[var(--color-on-dark-muted)]">{g.notes}</p> : null}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(g);
                    setEditNotes(g.notes ?? "");
                  }}
                  className="rounded-lg p-1.5 text-[var(--color-on-dark-muted)] hover:bg-white/10"
                  aria-label="Заметка"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(g.id)}
                  className="rounded-lg p-1.5 text-[var(--color-on-dark-muted)] hover:bg-red-500/25 hover:text-red-100"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showForm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={createGuest}
            className="establishment-dialog w-full max-w-md rounded-lg border border-[var(--color-brand-gold)]/35 p-4"
          >
            <h3 className="text-sm font-medium text-[var(--color-on-dark)]">Новый гость</h3>
            <div className="mt-4 grid gap-2">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Имя *"
                className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-3 py-2 text-[var(--color-on-dark)]"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон"
                className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-3 py-2 text-[var(--color-on-dark)]"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-3 py-2 text-[var(--color-on-dark)]"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Заметка"
                rows={2}
                className="rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-3 py-2 text-[var(--color-on-dark)]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-[var(--color-on-dark-muted)]">
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] disabled:opacity-50"
              >
                Сохранить
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {editing ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="establishment-dialog w-full max-w-md rounded-lg border border-[var(--color-brand-gold)]/35 p-4">
            <h3 className="text-sm font-medium text-[var(--color-on-dark)]">Заметка</h3>
            <p className="text-sm text-[var(--color-on-dark-muted)]">{editing.displayName}</p>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-[var(--color-brand-gold)]/25 bg-white/[0.09] px-3 py-2 text-[var(--color-on-dark)]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="text-sm text-[var(--color-on-dark-muted)]">
                Отмена
              </button>
              <button
                type="button"
                onClick={saveNotes}
                className="rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f]"
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
