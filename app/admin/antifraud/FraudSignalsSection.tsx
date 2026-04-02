"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY, ADMIN_BTN_SM } from "@/lib/admin-button-classes";

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

function ruleKindBadge(ruleCode: string): { label: string; className: string } {
  if (ruleCode.startsWith("LOGIN_")) {
    return {
      label: "Вход",
      className:
        "border border-amber-400/45 bg-amber-500/25 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    };
  }
  if (ruleCode.startsWith("PAYOUT_")) {
    return {
      label: "Вывод",
      className:
        "border border-orange-400/40 bg-orange-500/22 text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    };
  }
  if (ruleCode.startsWith("PAY_")) {
    return {
      label: "Оплата",
      className:
        "border border-rose-400/45 bg-rose-500/25 text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    };
  }
  return {
    label: "Другое",
    className: "border border-white/25 bg-white/10 text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
  };
}

export function FraudSignalsSection() {
  const [data, setData] = useState<FraudSignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="cabinet-section-header mb-6 rounded-2xl border-0 p-4 sm:p-6">
      <div className="fraud-signals-panel min-w-0 rounded-xl border border-rose-500/25 bg-rose-950/20 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="fraud-signals-panel-title text-base font-semibold">Подозрительная активность</h2>
            <p className="fraud-signals-panel-lead mt-1 text-xs leading-relaxed">
              Только для наблюдения: сигналы не блокируют платежи. Блокировку делайте вручную в карточке пользователя.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} shrink-0 gap-2 px-4 py-2.5 text-sm disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Обновить
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
            {error}
          </p>
        )}

        {loading && !data && <p className="text-sm text-white/60">Загрузка…</p>}

        {data && (
          <p className="fraud-signals-panel-meta mb-3 text-xs leading-relaxed">
            За выбранный период (до {data.days} дн.) зафиксированы сигналы по{" "}
            <span className="fraud-signals-panel-meta-num font-semibold tabular-nums">{data.distinctUserCount}</span>{" "}
            {data.distinctUserCount % 10 === 1 && data.distinctUserCount % 100 !== 11
              ? "аккаунту"
              : "аккаунтам"}
            . Ниже — до {data.groups.length} с последней активностью.
          </p>
        )}

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
          <div className="admin-fraud-signals-table-wrap max-h-[min(70vh,720px)] overflow-auto rounded-lg">
            <table className="admin-fraud-signals-table w-full min-w-0 border-collapse text-left text-sm md:min-w-[680px]">
              <thead>
                <tr className="text-xs uppercase tracking-wide">
                  <th className="px-3 py-2.5 font-medium">Пользователь</th>
                  <th className="px-3 py-2.5 font-medium">Статус</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Последний сигнал</th>
                  <th className="px-3 py-2.5 font-medium min-w-[12rem]">Причины (последние)</th>
                  <th className="fraud-signals-action-cell px-3 py-2.5 font-medium text-right sm:text-left">Действие</th>
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
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-white/80">
                      {formatDate(g.lastSignalAt, { includeYear: true })}
                    </td>
                    <td className="px-3 py-3">
                      <ul className="m-0 max-w-xl list-none space-y-2 p-0">
                        {g.signals.map((s) => {
                          const badge = ruleKindBadge(s.ruleCode);
                          return (
                            <li
                              key={s.id}
                              className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2"
                            >
                              <span
                                className={`inline-flex shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                              <span className="min-w-0 flex-1 text-xs leading-snug">
                                <span className="text-white/45">{formatDate(s.createdAt, { includeYear: true })} — </span>
                                <span className="text-white/[0.92]">{s.message}</span>
                                <span className="ml-1 font-mono text-[10px] text-white/35">({s.ruleCode})</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="fraud-signals-action-cell px-3 py-3 text-right sm:text-left">
                      <Link
                        href={`/admin/users/${g.userId}`}
                        className={`${ADMIN_BTN} ${ADMIN_BTN_SM} inline-flex items-center gap-1.5`}
                      >
                        Карточка
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      </Link>
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
