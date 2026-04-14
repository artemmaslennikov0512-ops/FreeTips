"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Check, X } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";

type Row = {
  id: string;
  status: string;
  statusHint: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  userLogin: string;
  userFullName: string | null;
  userEmail: string | null;
};

export default function EstablishmentJoinRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/establishment/join-requests?status=PENDING", { headers: authHeaders() });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Не удалось загрузить заявки");
      return;
    }
    const data = (await res.json()) as { requests: Row[] };
    setRows(data.requests ?? []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const approve = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/establishment/join-requests/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(), ...getCsrfHeader() },
        body: "{}",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось одобрить заявку");
        return;
      }
      if (data.message) {
        alert(data.message);
      }
      await load();
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Причина отклонения (необязательно)") ?? "";
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/establishment/join-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(), ...getCsrfHeader() },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось отклонить заявку");
        return;
      }
      await load();
    } catch {
      setError("Не удалось связаться с сервером");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--color-on-dark-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-2">
      <div className="text-center">
        <h1 className="font-[family:var(--font-playfair)] text-lg font-semibold text-white">
          Подключение сотрудников
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-white/75">
          Заявки от официантов, которые указали код вашего заведения. После одобрения создаётся карточка сотрудника и
          выдаётся код для чаевых; официанту нужно войти в аккаунт заново.
        </p>
      </div>

      {error && (
        <div
          className="rounded-[10px] border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/12 px-4 py-3 text-center text-sm text-white"
          role="alert"
        >
          <span className="text-[var(--color-accent-red)]">Ошибка. </span>
          <span className="text-white/95">{error}</span>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-center text-sm text-white/70">Нет ожидающих заявок.</p>
      ) : (
        <ul className="space-y-3 text-start">
          {rows.map((r) => (
            <li
              key={r.id}
              className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-3.5 text-[var(--color-text)] shadow-[var(--shadow-subtle)] sm:p-4"
            >
              <p className="font-medium">{r.userFullName || r.userLogin}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">@{r.userLogin}</p>
              {r.userEmail && <p className="text-sm text-[var(--color-muted)]">{r.userEmail}</p>}
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                {new Date(r.createdAt).toLocaleString("ru-RU")} · {r.statusHint}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={actingId === r.id}
                  onClick={() => void approve(r.id)}
                  className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} min-h-[48px] w-full justify-center gap-1.5 px-4 py-3 text-sm disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2`}
                >
                  {actingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden />
                  )}
                  Одобрить
                </button>
                <button
                  type="button"
                  disabled={actingId === r.id}
                  onClick={() => void reject(r.id)}
                  className={`${ADMIN_BTN} ${ADMIN_BTN_SM} min-h-[48px] w-full justify-center gap-1.5 border border-[var(--color-brand-gold)]/25 px-4 py-3 text-sm text-[var(--color-text)] disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-2`}
                >
                  <X className="h-4 w-4" aria-hidden />
                  Отклонить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
