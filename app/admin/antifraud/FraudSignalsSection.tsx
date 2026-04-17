"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ShieldAlert, Ban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_DANGER, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";
import { PANEL_SECTION_CARD_SM } from "@/lib/panel-shell-visual-classes";

interface FraudSignalRow {
  id: string;
  ruleCode: string;
  message: string;
  createdAt: string;
}

interface FraudGroup {
  userId: string;
  login: string;
  email: string | null;
  role: string;
  isBlocked: boolean;
  lastSignalAt: string;
  signals: FraudSignalRow[];
}

interface FraudSignalsResponse {
  groups: FraudGroup[];
  distinctUserCount: number;
  days: number;
}

const BADGE_BASE =
  "mb-1 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide";

/** Бейджи типа сигнала: светлая тема — пастель/тёмный кегль; тёмная — как раньше. */
function ruleKindBadge(ruleCode: string): { label: string; className: string; title: string } {
  if (ruleCode.startsWith("LOGIN_")) {
    return {
      label: "Вход",
      className: `${BADGE_BASE} border-amber-400/50 bg-amber-100 text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/22 dark:text-amber-100`,
      title: "Вход в аккаунт",
    };
  }
  if (ruleCode.startsWith("PAYOUT_")) {
    return {
      label: "− Вывод",
      className: `${BADGE_BASE} border-orange-400/50 bg-orange-100 text-orange-950 dark:border-orange-400/50 dark:bg-orange-600/30 dark:text-orange-50`,
      title: "Заявка на вывод",
    };
  }
  if (ruleCode.startsWith("PAY_")) {
    return {
      label: "+ Оплата",
      className: `${BADGE_BASE} border-emerald-500/45 bg-emerald-100 text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-600/28 dark:text-emerald-50`,
      title: "Оплата в пользу получателя",
    };
  }
  if (ruleCode.startsWith("ACCOUNT_")) {
    return {
      label: "Аккаунт",
      className: `${BADGE_BASE} border-violet-400/45 bg-violet-100 text-violet-950 dark:border-violet-400/40 dark:bg-violet-500/22 dark:text-violet-100`,
      title: "Событие аккаунта",
    };
  }
  return {
    label: "Другое",
    className: `${BADGE_BASE} border-slate-300 bg-slate-100 text-slate-800 dark:border-white/25 dark:bg-white/10 dark:text-white/85`,
    title: "Прочее",
  };
}

export function FraudSignalsSection() {
  const [data, setData] = useState<FraudSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/admin/fraud-signals?days=90&users=50");
      if (!res.ok) {
        setError("Не удалось загрузить сигналы");
        return;
      }
      setData((await res.json()) as FraudSignalsResponse);
    } catch {
      setError("Не удалось загрузить сигналы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canShowBlock = (role: string, isBlocked: boolean) =>
    !isBlocked && role !== "SUPERADMIN";

  const handleBlockUser = async (userId: string, login: string) => {
    if (
      !window.confirm(
        `Заблокировать пользователя «${login}»? Вход и операции в ЛК будут недоступны до разблокировки в карточке пользователя.`,
      )
    ) {
      return;
    }
    setBlockingUserId(userId);
    try {
      const res = await fetchWithAuth(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isBlocked: true }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(body.error ?? "Не удалось заблокировать");
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              groups: prev.groups.map((g) =>
                g.userId === userId ? { ...g, isBlocked: true } : g,
              ),
            }
          : prev,
      );
    } catch {
      alert("Ошибка соединения");
    } finally {
      setBlockingUserId(null);
    }
  };

  return (
    <section className={PANEL_SECTION_CARD_SM}>
      <div className="fraud-signals-panel antifraud-inner cabinet-block-inner min-w-0 rounded-xl border border-[var(--color-brand-gold)]/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <h2 className="fraud-signals-panel-title text-sm font-semibold text-[var(--color-text)]">
            Подозрительная активность
          </h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-1.5 px-3 py-2 text-xs disabled:opacity-50`}
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Обновить
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-center text-sm text-red-800 dark:border-[var(--color-accent-red)]/35 dark:bg-[var(--color-accent-red)]/10 dark:text-white/90">
            {error}
          </p>
        )}

        {loading && !data && (
          <p className="text-center text-xs text-[var(--color-muted)]">Загрузка…</p>
        )}

        {data && data.groups.length === 0 && !loading && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[rgba(10,25,47,0.1)] bg-[rgba(10,25,47,0.03)] px-3 py-6 text-center dark:border-white/10 dark:bg-black/20"
            role="status"
          >
            <ShieldAlert className="h-8 w-8 text-emerald-600 dark:text-emerald-400/90" aria-hidden />
            <p className="text-xs text-[var(--color-text-secondary)] dark:text-white/75">
              Пока пусто — сигналы появятся при срабатывании правил.
            </p>
          </div>
        )}

        {data && data.groups.length > 0 && (
          <ul className="min-w-0 space-y-3" aria-label="Сигналы по пользователям">
            {data.groups.map((g) => (
              <li
                key={g.userId}
                className="min-w-0 rounded-xl border border-[rgba(10,25,47,0.1)] bg-white p-4 shadow-sm dark:border-white/12 dark:bg-black/25 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] xl:items-start xl:gap-6">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] dark:text-white/50">
                      Пользователь
                    </p>
                    <p className="break-words font-semibold text-[var(--color-text)] dark:text-white">{g.login}</p>
                    {g.email ? (
                      <p className="break-all text-xs text-[var(--color-text-secondary)] dark:text-white/55">{g.email}</p>
                    ) : null}
                    <p className="text-xs text-[var(--color-muted)] dark:text-white/45">{g.role}</p>
                    <div className="mt-2">
                      {g.isBlocked ? (
                        <span className="inline-flex rounded-full border border-rose-400/45 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-900 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100">
                          Активен
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 border-t border-[rgba(10,25,47,0.08)] pt-3 dark:border-white/10 xl:border-t-0 xl:pt-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] dark:text-white/50">
                      Последний сигнал
                    </p>
                    <p className="mb-3 text-sm text-[var(--color-text)] dark:text-white/85">
                      {formatDate(g.lastSignalAt, { includeYear: true })}
                    </p>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] dark:text-white/50">
                      Сигналы
                    </p>
                    <ul className="m-0 list-none space-y-3 p-0 text-left">
                      {g.signals.map((s) => {
                        const badge = ruleKindBadge(s.ruleCode);
                        return (
                          <li key={s.id} className="min-w-0">
                            <span title={badge.title} className={badge.className}>
                              {badge.label}
                            </span>
                            <p className="mt-1 break-words text-sm leading-relaxed text-[var(--color-text)] dark:text-white/[0.92]">
                              <span className="text-[var(--color-muted)] dark:text-white/45">
                                {formatDate(s.createdAt, { includeYear: true })} —{" "}
                              </span>
                              {s.message}
                              <span className="ml-1 font-mono text-[11px] text-[var(--color-muted)] dark:text-white/35">
                                ({s.ruleCode})
                              </span>
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex w-full flex-col gap-2 border-t border-[rgba(10,25,47,0.08)] pt-3 sm:flex-row sm:flex-wrap sm:justify-end xl:w-auto xl:flex-col xl:border-t-0 xl:pt-0 xl:pl-2">
                    {canShowBlock(g.role, g.isBlocked) && (
                      <button
                        type="button"
                        disabled={blockingUserId === g.userId}
                        onClick={() => void handleBlockUser(g.userId, g.login)}
                        className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} ${ADMIN_BTN_SM} flex w-full items-center justify-center gap-1.5 sm:w-auto xl:w-full disabled:opacity-50`}
                      >
                        <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {blockingUserId === g.userId ? "Блокируем…" : "Заблокировать"}
                      </button>
                    )}
                    <Link
                      href={`/admin/users/${g.userId}`}
                      className={`${ADMIN_BTN} ${ADMIN_BTN_SM} flex w-full items-center justify-center gap-1.5 sm:w-auto xl:w-full`}
                    >
                      Карточка пользователя
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
