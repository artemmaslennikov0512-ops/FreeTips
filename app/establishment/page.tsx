"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, PieChart, BarChart3, Wallet } from "lucide-react";
import { authHeaders } from "@/lib/auth-client";

interface EstablishmentInfo {
  id: string;
  name: string;
  uniqueSlug: string;
  maxEmployeesCount: number | null;
  employeesCount: number;
}

interface Stats {
  totalTipsKop: number;
  transactionsCount: number;
  byDay: { date: string; amountKop: number }[];
  employeesCount: number;
}

function formatKop(kop: number): string {
  if (kop >= 100) {
    return `${(kop / 100).toFixed(0)} ₽`;
  }
  return `${(kop / 100).toFixed(2)} ₽`;
}

export default function EstablishmentPage() {
  const [info, setInfo] = useState<EstablishmentInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = authHeaders();
        const [infoRes, statsRes] = await Promise.all([
          fetch("/api/establishment/info", { headers }),
          fetch("/api/establishment/stats?period=7d", { headers }),
        ]);
        if (!infoRes.ok) {
          setError("Не удалось загрузить данные заведения");
          setLoading(false);
          return;
        }
        const infoData = await infoRes.json();
        setInfo(infoData);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setStats({
            totalTipsKop: 0,
            transactionsCount: 0,
            byDay: [],
            employeesCount: infoData.employeesCount ?? 0,
          });
        }
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-white/90">Загрузка…</div>
    );
  }

  if (error || !info) {
    return (
      <div className="rounded-xl bg-red-500/20 px-4 py-2 text-red-200">
        {error ?? "Заведение не найдено"}
      </div>
    );
  }

  const totalTips = stats?.totalTipsKop ?? 0;
  const txCount = stats?.transactionsCount ?? 0;
  const employeesCount = info.employeesCount;
  const limitText = `${employeesCount}`;

  return (
    <div className="establishment-dashboard-surface cabinet-card flex min-h-0 min-w-0 w-full max-w-full flex-col rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-3">
          <div className="flex w-full shrink-0 flex-col items-center gap-3 sm:gap-4">
            <div className="cabinet-dashboard-name-hero w-full min-w-0 px-0">
              <div className="cabinet-dashboard-name-hero__pill">
                <p className="cabinet-dashboard-name-hero__text">{info.name}</p>
              </div>
            </div>
            <p className="text-center text-sm text-[var(--color-text-secondary)]">Сводка и быстрые действия</p>

            <div className="mx-auto grid w-full max-w-2xl gap-2.5 sm:max-w-3xl sm:grid-cols-2 sm:gap-3 lg:max-w-4xl lg:grid-cols-3">
              <Link
                href="/establishment/team"
                className="cabinet-block-inner flex flex-col rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-3 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-0.5 shadow-[var(--shadow-subtle)] sm:p-3.5"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[var(--color-text)]/90">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Команда</span>
                </div>
                <p className="text-lg font-semibold leading-tight text-[var(--color-text)]">{limitText}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">сотрудников</p>
                <span className="mt-2 text-xs font-medium text-[var(--color-brand-gold)] hover:underline">
                  Управление командой →
                </span>
              </Link>

              <Link
                href="/establishment/analytics"
                className="cabinet-block-inner flex flex-col rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-3 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-0.5 shadow-[var(--shadow-subtle)] sm:p-3.5"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[var(--color-text)]/90">
                  <Wallet className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Чаевые за 7 дней</span>
                </div>
                <p className="text-lg font-semibold leading-tight text-[var(--color-text)]">{formatKop(totalTips)}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {txCount} {txCount === 1 ? "транзакция" : "транзакций"}
                </p>
                <span className="mt-2 text-xs font-medium text-[var(--color-brand-gold)] hover:underline">
                  Аналитика →
                </span>
              </Link>

              <Link
                href="/establishment/payout-rules"
                className="cabinet-block-inner flex flex-col rounded-lg border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-3 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-0.5 shadow-[var(--shadow-subtle)] sm:col-span-2 sm:p-3.5 lg:col-span-1"
              >
                <div className="mb-1 flex items-center gap-1.5 text-[var(--color-text)]/90">
                  <PieChart className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">Распределение</span>
                </div>
                <p className="text-[11px] leading-snug text-[var(--color-text)]">
                  Доля заведения и правила распределения пула между командой по коэффициентам.
                </p>
                <span className="mt-2 text-xs font-medium text-[var(--color-brand-gold)] hover:underline">
                  Настроить правила →
                </span>
              </Link>
            </div>
          </div>

          <div id="quick-actions" className="w-full shrink-0 border-t border-[var(--color-brand-gold)]/15 pt-4">
            <h3 className="mb-3 text-center font-[family:var(--font-playfair)] text-base font-semibold text-[var(--color-text)]">
              Быстрые действия
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/establishment/team"
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-sm font-semibold text-[#0a192f] hover:opacity-90 sm:px-6 sm:py-3"
              >
                <Users className="h-5 w-5 shrink-0" />
                Команда
              </Link>
              <Link
                href="/establishment/payout-rules"
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/35 bg-[var(--color-dark-gray)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-brand-gold)]/50 hover:bg-[var(--color-dark-gray)]/18 sm:px-6 sm:py-3"
              >
                <PieChart className="h-5 w-5 shrink-0" />
                Распределение
              </Link>
              <Link
                href="/establishment/analytics"
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/35 bg-[var(--color-dark-gray)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-brand-gold)]/50 hover:bg-[var(--color-dark-gray)]/18 sm:px-6 sm:py-3"
              >
                <BarChart3 className="h-5 w-5 shrink-0" />
                Аналитика
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
