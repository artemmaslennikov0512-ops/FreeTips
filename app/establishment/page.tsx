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
  const limitText =
    info.maxEmployeesCount != null
      ? `${employeesCount} из ${info.maxEmployeesCount}`
      : `${employeesCount}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-white mb-2 text-center">
          Кабинет заведения
        </h1>
        <p className="text-white/90">
          {info.name} · сводка и быстрые действия
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/establishment/team"
          className="cabinet-block-inner flex flex-col rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-1 shadow-[var(--shadow-subtle)]"
        >
          <div className="flex items-center gap-3 text-white/90 mb-2">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Команда</span>
          </div>
          <p className="text-2xl font-semibold text-white">{limitText}</p>
          <p className="text-sm text-white/90 mt-1">сотрудников</p>
          <span className="mt-3 text-sm font-medium text-[var(--color-brand-gold)] hover:underline">
            Управление командой →
          </span>
        </Link>

        <Link
          href="/establishment/analytics"
          className="cabinet-block-inner flex flex-col rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-1 shadow-[var(--shadow-subtle)]"
        >
          <div className="flex items-center gap-3 text-white/90 mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium">Чаевые за 7 дней</span>
          </div>
          <p className="text-2xl font-semibold text-white">{formatKop(totalTips)}</p>
          <p className="text-sm text-white/90 mt-1">
            {txCount} {txCount === 1 ? "транзакция" : "транзакций"}
          </p>
          <span className="mt-3 text-sm font-medium text-[var(--color-brand-gold)] hover:underline">
            Аналитика →
          </span>
        </Link>

        <Link
          href="/establishment/payout-rules"
          className="cabinet-block-inner flex flex-col rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-1 shadow-[var(--shadow-subtle)] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center gap-3 text-white/90 mb-2">
            <PieChart className="h-5 w-5" />
            <span className="text-sm font-medium">Распределение</span>
          </div>
          <p className="text-sm text-white">
            Доля заведения и правила распределения пула между командой по коэффициентам.
          </p>
          <span className="mt-3 text-sm font-medium text-[var(--color-brand-gold)] hover:underline">
            Настроить правила →
          </span>
        </Link>
      </div>

      <div id="quick-actions" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-0 px-6 py-4 text-center">
          <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-white text-center">
            Быстрые действия
          </h3>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/establishment/team"
              className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90"
            >
              <Users className="h-4 w-4" />
              Команда
            </Link>
            <Link
              href="/establishment/payout-rules"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2.5 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
            >
              <PieChart className="h-4 w-4" />
              Распределение
            </Link>
            <Link
              href="/establishment/analytics"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-4 py-2.5 font-medium text-white hover:bg-[var(--color-dark-gray)]/20"
            >
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
