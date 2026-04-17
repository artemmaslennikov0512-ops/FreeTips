"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, Send, DollarSign, ShieldAlert, Activity } from "lucide-react";
import { formatMoneyCompact } from "@/lib/utils";
import { ADMIN_PANEL_STATE_CENTER } from "@/lib/admin-surface-classes";
import { fetchWithAuth } from "@/lib/auth-client";

interface Stats {
  usersCount: number;
  usersActiveInLkCount: number;
  transactionsCount: number;
  transactionsSumKop: number;
  payoutsPendingCount: number;
  payoutsPendingSumKop: number;
  period: string;
  defaultPayoutDailyLimitCount?: number;
  defaultPayoutDailyLimitKop?: number;
  defaultPayoutMonthlyLimitCount?: number | null;
  defaultPayoutMonthlyLimitKop?: number | null;
  defaultAutoConfirmEnabled?: boolean;
  defaultAutoConfirmThresholdKop?: number | null;
  fraudFlaggedUsers30d?: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestsTotal, setPendingRequestsTotal] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/stats");

        if (!res.ok) {
          setError("Ошибка загрузки статистики");
          return;
        }

        const data = (await res.json()) as Stats;
        setStats({
          ...data,
          usersActiveInLkCount:
            typeof data.usersActiveInLkCount === "number" ? data.usersActiveInLkCount : 0,
        });
      } catch {
        setError("Ошибка загрузки статистики");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/admin/requests-counts");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { totalPending?: number };
        if (!cancelled) {
          setPendingRequestsTotal(typeof data.totalPending === "number" ? data.totalPending : 0);
        }
      } catch {
        if (!cancelled) setPendingRequestsTotal(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="text-center text-white/90">Загрузка…</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={ADMIN_PANEL_STATE_CENTER}>
        <div className="max-w-md text-center text-white/90">{error || "Ошибка загрузки"}</div>
      </div>
    );
  }

  const onlineCount = stats.usersActiveInLkCount;

  const cards: {
    title: string;
    value: string;
    icon: typeof Users;
    href?: string;
    onlineAccent?: boolean;
  }[] = [
    { title: "Пользователей", value: stats.usersCount.toLocaleString("ru-RU"), icon: Users },
    {
      title: "Сейчас в ЛК",
      value: onlineCount.toLocaleString("ru-RU"),
      icon: Activity,
      href: "/admin/users?lkActive=true",
      onlineAccent: true,
    },
    { title: "Транзакций", value: stats.transactionsCount.toLocaleString("ru-RU"), icon: TrendingUp },
    { title: "Сумма транзакций", value: formatMoneyCompact(stats.transactionsSumKop), icon: DollarSign },
    { title: "Заявок на вывод", value: stats.payoutsPendingCount.toLocaleString("ru-RU"), icon: Send },
    { title: "Сумма заявок", value: formatMoneyCompact(stats.payoutsPendingSumKop), icon: DollarSign },
  ];

  const periodLabel =
    stats.period === "day"
      ? "за сутки"
      : stats.period === "week"
        ? "за 7 дней"
        : stats.period === "all"
          ? "за всё время"
          : stats.period
            ? `период: ${stats.period}`
            : null;

  return (
    <div className="admin-dashboard-shell cabinet-card flex min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden rounded-[10px] border-0 lg:min-h-[min(56vh,560px)]">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-6">
          <div className="flex w-full shrink-0 flex-col items-center gap-8">
            <div className="cabinet-dashboard-name-hero w-full min-w-0 px-0">
              <div className="cabinet-dashboard-name-hero__pill">
                <p className="cabinet-dashboard-name-hero__text">Панель администратора</p>
              </div>
            </div>
            {periodLabel != null && (
              <p className="text-center text-sm text-[var(--color-text-secondary)]">Сводка {periodLabel}</p>
            )}

            {stats.fraudFlaggedUsers30d != null && stats.fraudFlaggedUsers30d > 0 && (
              <Link
                href="/admin/antifraud"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-center text-sm text-[var(--color-text)] transition-colors hover:bg-rose-500/15 dark:border-rose-500/40 dark:bg-rose-950/30 dark:text-rose-100 dark:hover:bg-rose-950/45"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden />
                <span>
                  <span className="font-semibold tabular-nums text-rose-800 dark:text-rose-50">{stats.fraudFlaggedUsers30d}</span>{" "}
                  {stats.fraudFlaggedUsers30d % 10 === 1 && stats.fraudFlaggedUsers30d % 100 !== 11
                    ? "аккаунт"
                    : stats.fraudFlaggedUsers30d % 10 >= 2 &&
                        stats.fraudFlaggedUsers30d % 10 <= 4 &&
                        (stats.fraudFlaggedUsers30d % 100 < 10 || stats.fraudFlaggedUsers30d % 100 >= 20)
                      ? "аккаунта"
                      : "аккаунтов"}{" "}
                  со сигналами антифрода за 30 дней — открыть «Антифрод»
                </span>
              </Link>
            )}
            {pendingRequestsTotal != null && pendingRequestsTotal > 0 && (
              <Link
                href="/admin/verification-requests"
                className="block w-full rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-sm text-[var(--color-text)] transition-colors hover:bg-amber-500/15 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100 dark:hover:bg-amber-500/25"
              >
                <span className="font-semibold tabular-nums text-amber-900 dark:text-amber-50">{pendingRequestsTotal}</span>{" "}
                {pendingRequestsTotal % 10 === 1 && pendingRequestsTotal % 100 !== 11
                  ? "новая заявка"
                  : pendingRequestsTotal % 10 >= 2 &&
                      pendingRequestsTotal % 10 <= 4 &&
                      (pendingRequestsTotal % 100 < 10 || pendingRequestsTotal % 100 >= 20)
                    ? "новые заявки"
                    : "новых заявок"}{" "}
                на рассмотрении — открыть раздел «Заявки»
              </Link>
            )}

            <div className="grid min-w-0 w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {cards.map((card) => {
                const Icon = card.icon;
                const body = (
                  <div
                    className={
                      card.onlineAccent
                        ? "admin-dashboard-card cabinet-section-header rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-6 shadow-[0_0_24px_-8px_rgba(16,185,129,0.25)]"
                        : "admin-dashboard-stat-tile admin-dashboard-card cabinet-section-header rounded-2xl border border-transparent p-6"
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white/90">{card.title}</p>
                        <p
                          className={
                            card.onlineAccent
                              ? "mt-2 text-xl font-bold tabular-nums text-emerald-300"
                              : "mt-2 text-xl font-bold text-white"
                          }
                        >
                          {card.value}
                        </p>
                      </div>
                      <div
                        className={
                          card.onlineAccent
                            ? "shrink-0 rounded-xl bg-emerald-500/20 p-3 ring-1 ring-emerald-400/30"
                            : "shrink-0 rounded-xl bg-white/20 p-3"
                        }
                      >
                        <Icon
                          className={
                            card.onlineAccent ? "h-6 w-6 text-emerald-400" : "h-6 w-6 text-[var(--color-brand-gold)]"
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
                return card.href ? (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="block min-w-0 transition-opacity hover:opacity-95"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={card.title} className="min-w-0">
                    {body}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full shrink-0 border-t border-[var(--color-brand-gold)]/15 pt-6">
            <h3 className="mb-4 text-center font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">
              Быстрые действия
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-medium text-[#0a192f] hover:opacity-90"
              >
                <Users className="h-4 w-4" />
                Пользователи
              </Link>
              <Link
                href="/admin/payouts"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/20"
              >
                <Send className="h-4 w-4" />
                Выводы
              </Link>
              <Link
                href="/admin/verification-requests"
                className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-dark-gray)]/20"
              >
                <ShieldAlert className="h-4 w-4" />
                Заявки
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
