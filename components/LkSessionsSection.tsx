"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchWithAuth, clearAccessToken } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";
import { ADMIN_PANEL_PAGE_XL } from "@/lib/admin-surface-classes";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

type LkSessionsVariant = "admin" | "cabinet" | "establishment";

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

/** Относительное время для строки «последняя активность» (на сервере время уже обновлено пульсом/refresh). */
function formatRelativeLastSeen(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 45_000) return "только что";
    if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин назад`;
    if (diff < 48 * 3600_000) return `${Math.floor(diff / 3600_000)} ч назад`;
    return `${Math.floor(diff / (24 * 3600_000))} дн. назад`;
  } catch {
    return "";
  }
}

/** Только раскладка и оболочки карточек; цвета — в globals.css (блок .lk-sessions). */
function shellForVariant(variant: LkSessionsVariant): { root: string; card: string; primaryBtn: string } {
  /** На всю ширину #main-content; горизонтальные отступы — у панели (px в layout), не сужаем max-w-* */
  const rootFullWidth = "w-full min-w-0 text-center";

  if (variant === "cabinet") {
    return {
      root: rootFullWidth,
      card:
        "lk-sessions__card cabinet-card mt-6 w-full rounded-[10px] border-0 p-4 sm:p-6 shadow-[var(--shadow-subtle)] text-left",
      primaryBtn: `lk-sessions__btn--primary ${CABINET_WAITER_BTN_INLINE}`,
    };
  }
  if (variant === "establishment") {
    return {
      root: rootFullWidth,
      card:
        "lk-sessions__card cabinet-card mt-6 w-full rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-4 sm:p-6 shadow-[var(--shadow-subtle)] text-left",
      primaryBtn: "lk-sessions__btn--primary",
    };
  }
  return {
    root: `${ADMIN_PANEL_PAGE_XL} min-w-0`,
    card:
      "lk-sessions__card cabinet-section-header mt-6 w-full rounded-2xl border-0 p-4 text-left shadow-[var(--shadow-card)] sm:p-6",
    primaryBtn: `lk-sessions__btn--primary ${ADMIN_BTN} ${ADMIN_BTN_PRIMARY}`,
  };
}

export function LkSessionsSection({ variant }: { variant: LkSessionsVariant }) {
  const router = useRouter();
  const shell = shellForVariant(variant);
  /** Завершение сессии — в стиле бренда (золото), без красного «danger». */
  const sessionEndBtnClass =
    variant === "admin" ? `${ADMIN_BTN} ${ADMIN_BTN_SM}` : "lk-sessions__btn--outline-gold";

  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  /** JWT выдан при «войти в кабинет» из админки; refresh в cookie — у админа, не у целевого пользователя. */
  const [impersonationView, setImpersonationView] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeOthersBusy, setRevokeOthersBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetchWithAuth("/api/profile/sessions", { credentials: "include" });
    if (!res.ok) {
      setLoadError("Не удалось загрузить список сессий.");
      setImpersonationView(false);
      setSessions([]);
      return;
    }
    const data = (await res.json()) as { sessions?: SessionItem[]; impersonationView?: boolean };
    setImpersonationView(data.impersonationView === true);
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
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
        <p className="lk-sessions__muted mt-6">
          {impersonationView ? (
            <>
              Нет активных серверных сессий у этого аккаунта. Если вы открыли кабинет из админки («войти от
              имени пользователя»), это ожидаемо: у вас нет refresh-сессии официанта, только просмотр по токену
              администратора. Собственные входы пользователя появятся здесь после его обычного входа по логину и
              паролю.
            </>
          ) : (
            <>Нет активных сессий. Войдите снова.</>
          )}
        </p>
      )}

      {sessions && sessions.length > 0 && (
        <div className={shell.card}>
          {impersonationView && (
            <p className="lk-sessions__muted mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-left text-sm">
              Просмотр от администратора: ниже перечислены реальные входы этого пользователя. Метка «это
              устройство» и кнопка «все, кроме текущей» для такого режима недоступны — ваша сессия привязана к
              другому аккаунту.
            </p>
          )}
          <div className="lk-sessions__toolbar lk-sessions__toolbar--end">
            <button
              type="button"
              disabled={impersonationView || othersCount === 0 || revokeOthersBusy}
              title={
                impersonationView
                  ? "В режиме просмотра из админки недоступно: текущая сессия в cookie — не этого пользователя."
                  : undefined
              }
              onClick={() => void revokeOthers()}
              className={sessionEndBtnClass}
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
                  <th className="lk-sessions__th">Последняя активность у сессии</th>
                  <th className="lk-sessions__th" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="lk-sessions__row">
                    <td className="lk-sessions__td">
                      <span className="lk-sessions__td--strong">{s.platformLabel}</span>
                      {s.isCurrent && <span className="lk-sessions__badge--current">это устройство</span>}
                      {!s.isCurrent && (
                        <span className="lk-sessions__muted mt-0.5 block text-xs">другой браузер или устройство</span>
                      )}
                      {s.deviceClientIdPreview &&
                        !s.platformLabel.includes(s.deviceClientIdPreview) && (
                          <div className="lk-sessions__muted mt-0.5 text-xs">
                            ID браузера: {s.deviceClientIdPreview}
                          </div>
                        )}
                    </td>
                    <td className="lk-sessions__td">{s.browserLabel ?? "—"}</td>
                    <td className="lk-sessions__td">{formatDt(s.createdAt)}</td>
                    <td className="lk-sessions__td">
                      <span className="block">{formatDt(s.lastSeenAt)}</span>
                      {formatRelativeLastSeen(s.lastSeenAt) && (
                        <span className="lk-sessions__muted text-xs">({formatRelativeLastSeen(s.lastSeenAt)})</span>
                      )}
                    </td>
                    <td className="lk-sessions__td text-right">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void revokeOne(s.id)}
                        className={s.isCurrent ? sessionEndBtnClass : shell.primaryBtn}
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
                  {s.isCurrent && <span className="lk-sessions__badge--current">это устройство</span>}
                </div>
                {!s.isCurrent && (
                  <p className="lk-sessions__muted mt-1 text-xs">Другой браузер или устройство</p>
                )}
                <p className="lk-sessions__muted mt-1 text-sm">Браузер: {s.browserLabel ?? "—"}</p>
                {s.deviceClientIdPreview && !s.platformLabel.includes(s.deviceClientIdPreview) && (
                  <p className="lk-sessions__muted mt-1 text-xs">ID браузера: {s.deviceClientIdPreview}</p>
                )}
                <dl className="lk-sessions__dl">
                  <div>
                    <dt>Первый вход: </dt>
                    <dd>{formatDt(s.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Активность сессии: </dt>
                    <dd>
                      {formatDt(s.lastSeenAt)}
                      {formatRelativeLastSeen(s.lastSeenAt) && (
                        <span className="lk-sessions__muted"> ({formatRelativeLastSeen(s.lastSeenAt)})</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void revokeOne(s.id)}
                  className={`mt-3 w-full ${s.isCurrent ? sessionEndBtnClass : shell.primaryBtn}`}
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
