"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_DANGER_SM, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { ADMIN_PANEL_PAGE_WIDE } from "@/lib/admin-surface-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

export type LkSessionsVariant = "admin" | "cabinet" | "establishment";

type SessionItem = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string | null;
  deviceLabel: string;
  locationLabel: string | null;
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

function variantStyles(variant: LkSessionsVariant) {
  if (variant === "cabinet") {
    return {
      outer: "",
      title: "font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]",
      desc: "mt-2 text-sm text-[var(--color-text-secondary)]",
      card: "mt-6 rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 sm:p-6 shadow-[var(--shadow-subtle)]",
      th: "text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/60",
      td: "py-3 text-sm text-[var(--color-text)]",
      badgeCurrent:
        "ml-2 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-200",
      muted: "text-[var(--color-text-secondary)]",
      rowBorder: "border-t border-[var(--color-text)]/10",
      dangerBtn: `${CABINET_WAITER_BTN_INLINE} border-red-500/50 text-red-200 hover:bg-red-500/10`,
      primaryBtn: CABINET_WAITER_BTN_INLINE,
    };
  }
  if (variant === "establishment") {
    return {
      outer: "mx-auto max-w-3xl text-white",
      title: "font-[family:var(--font-playfair)] text-2xl font-semibold text-white",
      desc: "mt-2 text-sm text-white/75",
      card: "mt-6 rounded-[10px] border border-white/10 bg-white/[0.06] p-4 sm:p-6 backdrop-blur-xl",
      th: "text-left text-xs font-semibold uppercase tracking-wide text-white/50",
      td: "py-3 text-sm text-white/90",
      badgeCurrent:
        "ml-2 inline-flex rounded-full border border-emerald-400/45 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200",
      muted: "text-white/65",
      rowBorder: "border-t border-white/10",
      dangerBtn:
        "rounded-xl border border-red-400/50 bg-red-500/10 px-3 py-1.5 text-sm text-red-200 hover:bg-red-500/20",
      primaryBtn:
        "rounded-xl border border-[var(--color-brand-gold)]/50 bg-[var(--color-brand-gold)]/15 px-3 py-1.5 text-sm text-white hover:bg-[var(--color-brand-gold)]/25",
    };
  }
  return {
    outer: ADMIN_PANEL_PAGE_WIDE,
    title: "font-[family:var(--font-playfair)] text-2xl font-semibold text-white",
    desc: "mx-auto mt-2 max-w-2xl text-sm text-white/80",
    card: "cabinet-section-header mx-auto mt-6 w-full max-w-4xl rounded-2xl border-0 p-4 text-left text-white shadow-[var(--shadow-card)] sm:p-6",
    th: "text-left text-xs font-semibold uppercase tracking-wide text-white/55",
    td: "py-3 text-sm text-white/90",
    badgeCurrent:
      "ml-2 inline-flex rounded-full border border-emerald-400/45 bg-emerald-950/35 px-2 py-0.5 text-[11px] font-medium text-emerald-200",
    muted: "text-white/70",
    rowBorder: "border-t border-white/10",
    dangerBtn: `${ADMIN_BTN} ${ADMIN_BTN_DANGER_SM}`,
    primaryBtn: `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY}`,
  };
}

export function LkSessionsSection({ variant }: { variant: LkSessionsVariant }) {
  const router = useRouter();
  const v = variantStyles(variant);
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
    <div className={v.outer}>
      <h1 className={v.title}>Сессии и устройства</h1>
      <p className={v.desc}>
        Активные входы в кабинет. Завершение сессии отзывает долгоживущий вход (refresh): на устройстве нужно
        снова ввести пароль. Текущий браузер помечается по cookie входа. Краткоживущий access token на чужом
        устройстве может ещё несколько часов работать без обновления — при подозрении смените пароль или
        включите 2FA в настройках.
      </p>

      {actionError && (
        <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </div>
      )}

      {loadError && <p className={`mt-4 ${v.muted}`}>{loadError}</p>}

      {sessions === null && !loadError && (
        <div className={`mt-8 flex items-center gap-2 ${v.muted}`}>
          <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
          Загрузка…
        </div>
      )}

      {sessions && sessions.length === 0 && !loadError && (
        <p className={`mt-6 ${v.muted}`}>Нет активных сессий. Войдите снова.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className={v.card}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${v.muted}`}>
              Сессий: <span className="font-medium text-inherit">{sessions.length}</span>
              {othersCount > 0 && (
                <>
                  {" "}
                  · других устройств:{" "}
                  <span className="font-medium text-inherit">{othersCount}</span>
                </>
              )}
            </p>
            <button
              type="button"
              disabled={othersCount === 0 || revokeOthersBusy}
              onClick={() => void revokeOthers()}
              className={v.dangerBtn}
            >
              {revokeOthersBusy ? "Завершение…" : "Завершить все, кроме текущей"}
            </button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr>
                  <th className={v.th}>Устройство</th>
                  <th className={v.th}>IP</th>
                  <th className={v.th}>Геолокация</th>
                  <th className={v.th}>Первый вход</th>
                  <th className={v.th}>Последняя активность</th>
                  <th className={v.th} />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className={v.rowBorder}>
                    <td className={v.td}>
                      <span className="font-medium">{s.deviceLabel}</span>
                      {s.isCurrent && <span className={v.badgeCurrent}>текущая</span>}
                    </td>
                    <td className={v.td}>{s.ip ?? "—"}</td>
                    <td className={v.td}>{s.locationLabel ?? "—"}</td>
                    <td className={v.td}>{formatDt(s.createdAt)}</td>
                    <td className={v.td}>{formatDt(s.lastSeenAt)}</td>
                    <td className={`${v.td} text-right`}>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void revokeOne(s.id)}
                        className={s.isCurrent ? v.dangerBtn : v.primaryBtn}
                      >
                        {busyId === s.id ? "…" : s.isCurrent ? "Выйти здесь" : "Завершить"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden space-y-4">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`rounded-lg border border-white/10 p-4 ${variant === "cabinet" ? "border-[var(--color-text)]/15 bg-[var(--color-dark-gray)]/5" : ""}`}
              >
                <div className="font-medium">
                  {s.deviceLabel}
                  {s.isCurrent && <span className={v.badgeCurrent}>текущая</span>}
                </div>
                <dl className={`mt-2 space-y-1 text-sm ${v.muted}`}>
                  <div>
                    <dt className="inline text-inherit opacity-80">IP: </dt>
                    <dd className="inline text-inherit">{s.ip ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-inherit opacity-80">Гео: </dt>
                    <dd className="inline text-inherit">{s.locationLabel ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-inherit opacity-80">Первый вход: </dt>
                    <dd className="inline text-inherit">{formatDt(s.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-inherit opacity-80">Активность: </dt>
                    <dd className="inline text-inherit">{formatDt(s.lastSeenAt)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void revokeOne(s.id)}
                  className={`mt-3 w-full ${s.isCurrent ? v.dangerBtn : v.primaryBtn}`}
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
