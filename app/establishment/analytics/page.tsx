"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface Stats {
  totalTipsKop: number;
  transactionsCount: number;
  byDay: { date: string; amountKop: number }[];
  employeesCount: number;
}

function formatKop(kop: number): string {
  return (kop / 100).toFixed(2);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d">("7d");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/establishment/stats?period=${period}`, {
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setStats(null);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const exportCsv = () => {
    if (!stats?.byDay?.length) return;
    const header = "Дата;Сумма (₽);Сумма (коп)";
    const rows = stats.byDay.map(
      (d) => `${formatDate(d.date)};${formatKop(d.amountKop)};${d.amountKop}`,
    );
    const totalRow = `Итого;${formatKop(stats.totalTipsKop)};${stats.totalTipsKop}`;
    const csv = [header, ...rows, totalRow].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `чаевые_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxDay = Math.max(
    ...(stats?.byDay?.map((d) => d.amountKop) ?? [1]),
    1,
  );

  if (loading && !stats) {
    return <div className="text-[var(--color-text-secondary)]">Загрузка…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
          Аналитика
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "7d" | "30d")}
            className="rounded-lg border border-white/20 bg-[var(--color-navy)] px-3 py-2 text-[var(--color-text)]"
          >
            <option value="7d">За 7 дней</option>
            <option value="30d">За 30 дней</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!stats?.byDay?.length}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-5">
              <p className="text-sm text-white/70">Всего чаевых за период</p>
              <p className="text-2xl font-semibold text-white">
                {(stats.totalTipsKop / 100).toFixed(2)} ₽
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-5">
              <p className="text-sm text-white/70">Количество транзакций</p>
              <p className="text-2xl font-semibold text-white">
                {stats.transactionsCount}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-5">
            <h2 className="text-lg font-medium text-white mb-4">По дням</h2>
            {stats.byDay.length === 0 ? (
              <p className="text-white/60">Нет данных за выбранный период.</p>
            ) : (
              <div className="space-y-3">
                {stats.byDay.map((d) => (
                  <div key={d.date} className="flex items-center gap-4">
                    <span className="w-28 text-sm text-white/80 shrink-0">
                      {formatDate(d.date)}
                    </span>
                    <div className="flex-1 h-6 rounded bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded bg-[var(--color-brand-gold)] min-w-[2px]"
                        style={{
                          width: `${(d.amountKop / maxDay) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-medium text-white shrink-0">
                      {(d.amountKop / 100).toFixed(2)} ₽
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
