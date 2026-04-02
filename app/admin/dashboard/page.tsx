"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, Send, DollarSign } from "lucide-react";
import { formatMoneyCompact } from "@/lib/utils";

interface Stats {
  usersCount: number;
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
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequestsTotal, setPendingRequestsTotal] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError("Ошибка загрузки статистики");
          return;
        }

        const data = await res.json();
        setStats(data);
      } catch {
        setError("Ошибка загрузки статистики");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/requests-counts", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-white/90">Загрузка...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-white/90">{error || "Ошибка загрузки"}</div>
      </div>
    );
  }

  const cards = [
    { title: "Пользователей", value: stats.usersCount.toLocaleString("ru-RU"), icon: Users },
    { title: "Транзакций", value: stats.transactionsCount.toLocaleString("ru-RU"), icon: TrendingUp },
    { title: "Сумма транзакций", value: formatMoneyCompact(stats.transactionsSumKop), icon: DollarSign },
    { title: "Заявок на вывод", value: stats.payoutsPendingCount.toLocaleString("ru-RU"), icon: Send },
    { title: "Сумма заявок", value: formatMoneyCompact(stats.payoutsPendingSumKop), icon: DollarSign },
  ];

  return (
    <div className="min-w-0 max-w-full">
      {pendingRequestsTotal != null && pendingRequestsTotal > 0 && (
        <Link
          href="/admin/verification-requests"
          className="mb-6 block rounded-2xl border border-amber-500/45 bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100 transition-colors hover:bg-amber-500/25"
        >
          <span className="font-semibold tabular-nums text-amber-50">{pendingRequestsTotal}</span>{" "}
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
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="admin-dashboard-card cabinet-section-header rounded-2xl border-0 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">{card.title}</p>
                  <p className="mt-2 text-xl font-bold text-white">{card.value}</p>
                </div>
                <div className="rounded-xl bg-white/20 p-3">
                  <Icon className="h-6 w-6 text-[var(--color-brand-gold)]" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
