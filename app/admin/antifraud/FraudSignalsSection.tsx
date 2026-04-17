"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldAlert, Ban } from "lucide-react";
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
  "fraud-signal-rule-badge inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide";

/** Бейджи типа сигнала: `!text-*` — перебивает глобальные правила таблиц в админке; без `text-white/` в классе (иначе #main-content заливает серым). */
function ruleKindBadge(ruleCode: string): { label: string; className: string; title: string } {
  if (ruleCode.startsWith("LOGIN_")) {
    return {
      label: "Вход",
      className: `${BADGE_BASE} border-amber-600/45 bg-amber-200 !text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/22 dark:!text-amber-100`,
      title: "Вход в аккаунт",
    };
  }
  if (ruleCode.startsWith("PAYOUT_")) {
    return {
      label: "− Вывод",
      className: `${BADGE_BASE} border-orange-600/45 bg-orange-200 !text-orange-950 dark:border-orange-400/50 dark:bg-orange-600/30 dark:!text-orange-50`,
      title: "Заявка на вывод",
    };
  }
  if (ruleCode.startsWith("PAY_")) {
    return {
      label: "+ Оплата",
      className: `${BADGE_BASE} border-emerald-600/45 bg-emerald-200 !text-emerald-950 dark:border-emerald-400/50 dark:bg-emerald-600/28 dark:!text-emerald-50`,
      title: "Оплата в пользу получателя",
    };
  }
  if (ruleCode.startsWith("ACCOUNT_")) {
    return {
      label: "Аккаунт",
      className: `${BADGE_BASE} border-violet-600/40 bg-violet-200 !text-violet-950 dark:border-violet-400/40 dark:bg-violet-500/22 dark:!text-violet-100`,
      title: "Событие аккаунта",
    };
  }
  return {
    label: "Другое",
    className: `${BADGE_BASE} border-slate-500/35 bg-slate-200 !text-slate-900 dark:border-white/25 dark:bg-white/10 dark:!text-slate-200`,
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
      <div className="fraud-signals-panel min-w-0 rounded-xl border border-[var(--color-brand-gold)]/25 p-3 sm:p-4">
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
            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[rgba(10,25,47,0.18)] px-3 py-6 text-center dark:border-white/18"
            role="status"
          >
            <ShieldAlert className="h-8 w-8 text-emerald-600 dark:text-emerald-400/90" aria-hidden />
            <p className="text-xs text-[var(--color-text-secondary)] dark:text-white/75">
              Пока пусто — сигналы появятся при срабатывании правил.
            </p>
          </div>
        )}

        {data && data.groups.length > 0 && (
          <div className="fraud-signals-table-shell min-w-0 w-full overflow-x-auto rounded-xl border border-[rgba(10,25,47,0.16)] shadow-[0_1px_4px_rgba(10,25,47,0.06)] dark:border-white/14 dark:shadow-none">
              <table
                className="fraud-signals-table fraud-signals-table--stacked admin-dashboard-table w-full border-collapse text-left text-xs sm:text-sm"
                aria-label="Сигналы по пользователям"
              >
              <thead>
                <tr>
                  <th scope="col" className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Пользователь
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Статус
                  </th>
                  <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">
                    Последний сигнал
                  </th>
                  <th scope="col" className="min-w-0 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide lg:min-w-[12rem]">
                    Сигналы
                  </th>
                  <th scope="col" className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <tr key={g.userId} className="align-top">
                    <td
                      data-label="Пользователь"
                      className="min-w-0 max-w-full px-3 py-2 align-top lg:max-w-[18rem]"
                    >
                      <Link
                        href={`/admin/users/${g.userId}`}
                        className="break-words text-xs font-medium text-[var(--color-brand-gold)] underline-offset-2 hover:underline sm:text-[13px]"
                      >
                        {g.login}
                      </Link>
                      {g.email ? (
                        <p className="mt-0.5 break-all text-[11px] leading-snug text-[var(--color-text-secondary)]">
                          {g.email}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                        {g.role}
                      </p>
                    </td>
                    <td data-label="Статус" className="px-3 py-2 align-top lg:whitespace-nowrap">
                      {g.isBlocked ? (
                        <span className="fraud-signal-status-badge inline-flex rounded-full border border-rose-600/40 bg-rose-200 px-2.5 py-1 text-xs font-semibold !text-rose-950 dark:border-rose-400/35 dark:bg-rose-500/20 dark:!text-rose-100">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="fraud-signal-status-badge inline-flex rounded-full border border-emerald-600/40 bg-emerald-200 px-2.5 py-1 text-xs font-semibold !text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:!text-emerald-100">
                          Активен
                        </span>
                      )}
                    </td>
                    <td
                      data-label="Последний сигнал"
                      className="px-3 py-2 align-top text-[var(--color-text)] lg:whitespace-nowrap"
                    >
                      {formatDate(g.lastSignalAt, { includeYear: true })}
                    </td>
                    <td data-label="Сигналы" className="min-w-0 px-3 py-2 align-top">
                      <ul className="m-0 list-none space-y-2 p-0">
                        {g.signals.map((s) => {
                          const badge = ruleKindBadge(s.ruleCode);
                          return (
                            <li key={s.id} className="flex min-w-0 gap-2.5">
                              <span title={badge.title} className={badge.className}>
                                {badge.label}
                              </span>
                              <div className="fraud-signal-line min-w-0 flex-1 break-words leading-relaxed">
                                <span className="fraud-signal-line-meta">
                                  {formatDate(s.createdAt, { includeYear: true })} —{" "}
                                </span>
                                {s.message}
                                <span className="fraud-signal-line-rulecode ml-1 font-mono text-[11px]">
                                  ({s.ruleCode})
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td data-label="Действия" className="px-3 py-2 align-top">
                      <div className="fraud-signals-actions flex justify-start lg:justify-end">
                        {canShowBlock(g.role, g.isBlocked) && (
                          <button
                            type="button"
                            disabled={blockingUserId === g.userId}
                            onClick={() => void handleBlockUser(g.userId, g.login)}
                            title="Заблокировать"
                            aria-label={`Заблокировать пользователя ${g.login}`}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} admin-btn--icon admin-btn--sm inline-flex items-center justify-center disabled:opacity-50`}
                          >
                            {blockingUserId === g.userId ? (
                              <span className="text-[11px] leading-none" aria-live="polite">
                                …
                              </span>
                            ) : (
                              <Ban className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
