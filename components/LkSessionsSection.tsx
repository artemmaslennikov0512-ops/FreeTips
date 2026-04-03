"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_DANGER_SM, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { ADMIN_PANEL_PAGE_XL } from "@/lib/admin-surface-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

export type LkSessionsVariant = "admin" | "cabinet" | "establishment";

type SessionItem = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  platformLabel: string;
  browserLabel: string | null;
  deviceClientIdPreview: string | null;
  isCurrent: boolean;
};

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Только раскладка и оболочки карточек; цвета — в globals.css (блок .lk-sessions). */
function shellForVariant(variant: LkSessionsVariant): { root: string; card: string; primaryBtn: string } {
  if (variant === "cabinet") {
    return {
      root: "mx-auto max-w-4xl text-center",
      card:
        "lk-sessions__card cabinet-card mt-6 rounded-[10px] border-0 p-4 sm:p-6 shadow-[var(--shadow-subtle)] text-left",
      primaryBtn: `lk-sessions__btn--primary ${CABINET_WAITER_BTN_INLINE}`,
    };
  }
  if (variant === "establishment") {
    return {
      root: "mx-auto max-w-3xl text-center",
      card:
        "lk-sessions__card cabinet-card mt-6 rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 sm:p-6 shadow-[var(--shadow-subtle)] text-left",
      primaryBtn: "lk-sessions__btn--primary",
    };
  }
  return {
    root: ADMIN_PANEL_PAGE_XL,
    card:
      "lk-sessions__card cabinet-section-header mx-auto mt-6 w-full rounded-2xl border-0 p-4 sm:p-6 text-left shadow-[var(--shadow-card)] sm:p-6",
    primaryBtn: `lk-sessions__btn--primary ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY}`,
  };
}

export function LkSessionsSection({ variant }: { variant: LkSessionsVariant }) {
  const router = useRouter();
  const shell = shellForVariant(variant);
  /** В админке опасная кнопка — только .admin-btn (цвета из globals админки). */
  const dangerBtnClass =
    variant === "admin" ? `${ADMIN_BTN} ${ADMIN_BTN_DANGER_SM}` : "lk-sessions__btn--danger";

  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeOthersBusy, setRevokeOthersBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetchWithAuth("/api/profile/sessions", { credentials: "include" });
    if (!res.ok) {
      setLoadError("Не удалось загрузить список сессий.");
      setSessions([]);
      return;
    }
    const data = (await res.json()) as { sessions?: SessionItem[] };
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const othersCount = sessions?.filter((s) => !s.isCurrent).length ?? 0;

  const revokeOne = async (id: string) => {
    setActionError(null);
    setBusyId(id);
    try {
      const res = await fetchWithAuth(`/api/profile/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string; endedCurrentSession?: boolean };
      if (!res.ok) {
        setActionError(data.error || "Ошибка");
        return;
      }
      if (data.endedCurrentSession) {
        clearAccessToken();
        router.replace("/login");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    if (othersCount === 0) return;
    if (!window.confirm(`Завершить все сессии кроме этой (${othersCount})?`)) return;
    setActionError(null);
    setRevokeOthersBusy(true);
    try {
      const res = await fetchWithAuth("/api/profile/sessions/revoke-others", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error || "Ошибка");
        return;
      }
      await load();
    } finally {
      setRevokeOthersBusy(false);
    }
  };

  return (
    <div className={`lk-sessions ${shell.root}`} data-lk-sessions-variant={variant}>
      <h1 className="lk-sessions__title">Сессии и устройства</h1>

      {actionError && <div className="lk-sessions__alert--error">{actionError}</div>}

      {loadError && (
        <p className="lk-sessions__muted mt-4" role="alert">
          {loadError}
        </p>
      )}

      {sessions === null && !loadError && (
        <div className="lk-sessions__muted mt-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
          Загрузка…
        </div>
      )}

      {sessions && sessions.length === 0 && !loadError && (
        <p className="lk-sessions__muted mt-6">Нет активных сессий. Войдите снова.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className={shell.card}>
          <div className="lk-sessions__toolbar lk-sessions__toolbar--end">
            <button
              type="button"
              disabled={othersCount === 0 || revokeOthersBusy}
              onClick={() => void revokeOthers()}
              className={dangerBtnClass}
            >
              {revokeOthersBusy ? "Завершение…" : "Завершить все, кроме текущей"}
            </button>
          </div>

          <div className="lk-sessions__table-wrap">
            <table className="lk-sessions__table">
              <thead>
                <tr>
                  <th className="lk-sessions__th">Устройство</th>
                  <th className="lk-sessions__th">Браузер</th>
                  <th className="lk-sessions__th">Первый вход</th>
                  <th className="lk-sessions__th">Последняя активность</th>
                  <th className="lk-sessions__th" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="lk-sessions__row">
                    <td className="lk-sessions__td">
                      <span className="lk-sessions__td--strong">{s.platformLabel}</span>
                      {s.isCurrent && <span className="lk-sessions__badge--current">текущая</span>}
                      {s.deviceClientIdPreview && (
                        <div className="lk-sessions__muted mt-0.5 text-xs">
                          Этот браузер: {s.deviceClientIdPreview}
                        </div>
                      )}
                    </td>
                    <td className="lk-sessions__td">{s.browserLabel ?? "—"}</td>
                    <td className="lk-sessions__td">{formatDt(s.createdAt)}</td>
                    <td className="lk-sessions__td">{formatDt(s.lastSeenAt)}</td>
                    <td className="lk-sessions__td text-right">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void revokeOne(s.id)}
                        className={s.isCurrent ? dangerBtnClass : shell.primaryBtn}
                      >
                        {busyId === s.id ? "…" : s.isCurrent ? "Выйти здесь" : "Завершить"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="lk-sessions__mobile-list">
            {sessions.map((s) => (
              <li key={s.id} className="lk-sessions__mobile-card">
                <div className="lk-sessions__td--strong">
                  {s.platformLabel}
                  {s.isCurrent && <span className="lk-sessions__badge--current">текущая</span>}
                </div>
                <p className="lk-sessions__muted mt-1 text-sm">Браузер: {s.browserLabel ?? "—"}</p>
                {s.deviceClientIdPreview && (
                  <p className="lk-sessions__muted mt-1 text-xs">Этот браузер: {s.deviceClientIdPreview}</p>
                )}
                <dl className="lk-sessions__dl">
                  <div>
                    <dt>Первый вход: </dt>
                    <dd>{formatDt(s.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Активность: </dt>
                    <dd>{formatDt(s.lastSeenAt)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void revokeOne(s.id)}
                  className={`mt-3 w-full ${s.isCurrent ? dangerBtnClass : shell.primaryBtn}`}
                >
                  {busyId === s.id ? "…" : s.isCurrent ? "Выйти здесь" : "Завершить сессию"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
