"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ShieldAlert, Ban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { ADMIN_BTN, ADMIN_BTN_DANGER, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";

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

/** Направление денег в сигнале: пополнение (клиент платит получателю) vs списание (вывод получателем). */
function ruleKindBadge(ruleCode: string): { label: string; className: string; title: string } {
  if (ruleCode.startsWith("LOGIN_")) {
    return {
      label: "Вход",
      className:
        "border border-amber-400/45 bg-amber-500/25 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      title: "Попытка входа в аккаунт, без движения средств по счёту получателя",
    };
  }
  if (ruleCode.startsWith("PAYOUT_")) {
    return {
      label: "− Списание",
      className:
        "border border-orange-400/50 bg-orange-600/30 text-orange-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      title: "Исходящая операция: заявка на вывод средств получателем",
    };
  }
  if (ruleCode.startsWith("PAY_")) {
    return {
      label: "+ Пополнение",
      className:
        "border border-emerald-400/50 bg-emerald-600/28 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      title: "Входящий платёж: инициализация или успешная оплата в пользу получателя",
    };
  }
  if (ruleCode.startsWith("ACCOUNT_")) {
    return {
      label: "Аккаунт",
      className:
        "border border-violet-400/40 bg-violet-500/22 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
      title: "Событие уровня аккаунта (без привязки к пополнению или выводу)",
    };
  }
  return {
    label: "Другое",
    className: "border border-white/25 bg-white/10 text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
    title: "Прочий сигнал правила",
  };
}

export function FraudSignalsSection() {
  const [data, setData] = useState<FraudSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/fraud-signals?days=90&users=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setBlockingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
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
    <section className="cabinet-section-header mb-6 rounded-2xl border-0 p-4 sm:p-6">
      <div className="fraud-signals-panel antifraud-inner cabinet-block-inner min-w-0 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/85 p-4 sm:p-5">
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          <h2 className="fraud-signals-panel-title text-base font-semibold">Подозрительная активность</h2>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Обновить
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/10 px-3 py-2 text-center text-sm text-white/90">
            {error}
          </p>
        )}

        {loading && !data && <p className="text-center text-sm text-white/60">Загрузка…</p>}

        {data && data.groups.length === 0 && !loading && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/15 px-4 py-8 text-center"
            role="status"
          >
            <ShieldAlert className="h-10 w-10 text-emerald-400/90" aria-hidden />
            <p className="text-sm text-white/75">Записей пока нет — сигналы появятся при срабатывании правил.</p>
          </div>
        )}

        {data && data.groups.length > 0 && (
          <>
            <ul className="min-w-0 space-y-3 lg:hidden" aria-label="Сигналы по пользователям">
              {data.groups.map((g) => (
                <li
                  key={g.userId}
                  className="min-w-0 rounded-xl border border-white/12 bg-black/25 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">Пользователь</p>
                      <p className="break-words font-semibold text-white">{g.login}</p>
                      {g.email ? (
                        <p className="break-all text-xs text-white/55">{g.email}</p>
                      ) : null}
                      <p className="text-xs text-white/45">{g.role}</p>
                    </div>
                    <div className="shrink-0">
                      {g.isBlocked ? (
                        <span className="inline-flex rounded-full border border-rose-400/35 bg-rose-500/20 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-rose-100">
                          Заблокирован
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-emerald-100">
                          Активен
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mb-3 border-t border-white/10 pt-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/50">Последний сигнал</p>
                    <p className="text-sm text-white/85">{formatDate(g.lastSignalAt, { includeYear: true })}</p>
                  </div>
                  <div className="mb-3 border-t border-white/10 pt-3">
                    <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-white/50">Причины</p>
                    <p className="mb-2 text-[10px] leading-snug text-white/40">
                      + пополнение (оплата в пользу получателя), − списание (вывод)
                    </p>
                    <ul className="m-0 list-none space-y-3 p-0">
                      {g.signals.map((s) => {
                        const badge = ruleKindBadge(s.ruleCode);
                        return (
                          <li key={s.id} className="min-w-0">
                            <span
                              title={badge.title}
                              className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                            <p className="break-words text-xs leading-relaxed text-white/[0.92]">
                              <span className="text-white/45">{formatDate(s.createdAt, { includeYear: true })} — </span>
                              {s.message}
                              <span className="ml-1 font-mono text-[10px] text-white/35">({s.ruleCode})</span>
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    {canShowBlock(g.role, g.isBlocked) && (
                      <button
                        type="button"
                        disabled={blockingUserId === g.userId}
                        onClick={() => void handleBlockUser(g.userId, g.login)}
                        className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} ${ADMIN_BTN_SM} flex w-full items-center justify-center gap-1.5 disabled:opacity-50`}
                      >
                        <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {blockingUserId === g.userId ? "Блокируем…" : "Заблокировать"}
                      </button>
                    )}
                    <Link
                      href={`/admin/users/${g.userId}`}
                      className={`${ADMIN_BTN} ${ADMIN_BTN_SM} flex w-full items-center justify-center gap-1.5`}
                    >
                      Карточка пользователя
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>

            <div className="admin-fraud-signals-table-wrap hidden max-h-[min(70vh,720px)] overflow-auto rounded-lg lg:block">
              <table className="admin-fraud-signals-table w-full min-w-[680px] border-collapse text-center text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide">
                    <th className="px-3 py-2.5 font-medium">Пользователь</th>
                    <th className="px-3 py-2.5 font-medium">Статус</th>
                    <th className="px-3 py-2.5 font-medium whitespace-nowrap">Последний сигнал</th>
                    <th className="min-w-[12rem] px-3 py-2.5 font-medium">
                      <span className="block">Причины (последние)</span>
                      <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-white/45">
                        + пополнение · − списание
                      </span>
                    </th>
                    <th className="fraud-signals-action-cell px-3 py-2.5 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g) => (
                    <tr key={g.userId}>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{g.login}</div>
                        {g.email && <div className="text-xs text-white/55">{g.email}</div>}
                        <div className="text-xs text-white/45">{g.role}</div>
                      </td>
                      <td className="px-3 py-3">
                        {g.isBlocked ? (
                          <span className="inline-flex rounded-full border border-rose-400/35 bg-rose-500/20 px-2.5 py-0.5 text-xs font-medium text-rose-100">
                            Заблокирован
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-100">
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-white/80">
                        {formatDate(g.lastSignalAt, { includeYear: true })}
                      </td>
                      <td className="px-3 py-3">
                        <ul className="m-0 mx-auto flex max-w-xl list-none flex-col items-center space-y-2 p-0 text-center">
                          {g.signals.map((s) => {
                            const badge = ruleKindBadge(s.ruleCode);
                            return (
                              <li
                                key={s.id}
                                className="flex w-full max-w-xl flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2"
                              >
                                <span
                                  title={badge.title}
                                  className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                                <span className="min-w-0 text-center text-xs leading-snug">
                                  <span className="text-white/45">{formatDate(s.createdAt, { includeYear: true })} — </span>
                                  <span className="text-white/[0.92]">{s.message}</span>
                                  <span className="ml-1 font-mono text-[10px] text-white/35">({s.ruleCode})</span>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="fraud-signals-action-cell px-3 py-3">
                        <div className="flex flex-col items-center gap-2">
                          {canShowBlock(g.role, g.isBlocked) && (
                            <button
                              type="button"
                              disabled={blockingUserId === g.userId}
                              onClick={() => void handleBlockUser(g.userId, g.login)}
                              className={`${ADMIN_BTN} ${ADMIN_BTN_DANGER} ${ADMIN_BTN_SM} inline-flex items-center gap-1.5 disabled:opacity-50`}
                            >
                              <Ban className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {blockingUserId === g.userId ? "Блокируем…" : "Заблокировать"}
                            </button>
                          )}
                          <Link
                            href={`/admin/users/${g.userId}`}
                            className={`${ADMIN_BTN} ${ADMIN_BTN_SM} inline-flex items-center gap-1.5`}
                          >
                            Карточка
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
