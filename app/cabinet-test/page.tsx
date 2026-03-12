"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  List,
  Link2,
  Settings,
  LogOut,
  MessageCircle,
  ShieldCheck,
  BadgeCheck,
  Key,
  Copy,
  RotateCw,
  Download,
  ExternalLink,
} from "lucide-react";
import { PremiumCard } from "@/app/cabinet/PremiumCard";
import { formatMoney } from "@/lib/utils";

const NAV = [
  { label: "Дашборд", href: "/cabinet-test", icon: LayoutDashboard },
  { label: "Операции", href: "#", icon: List },
  { label: "Моя ссылка", href: "#", icon: Link2 },
  { label: "Верификация", href: "#", icon: ShieldCheck },
  { label: "Поддержка", href: "#", icon: MessageCircle },
  { label: "Настройки профиля", href: "#", icon: Settings },
] as const;

const QUICK_ACTIONS = [
  { href: "#", icon: Link2, title: "Ссылка и QR", desc: "Скопировать ссылку для чаевых" },
  { href: "#", icon: List, title: "История операций и вывод средств", desc: "Все поступления, транзакции и вывод" },
  { href: "#api-key", icon: Key, title: "API ключ", desc: "Для интеграции с приложением" },
  { href: "#", icon: Settings, title: "Настройки профиля", desc: "Редактировать данные и пароль" },
] as const;

/** Тестовая страница дизайна ЛК: тёмно-золотая тема, те же классы и структура, mock-данные, без авторизации. */
export default function CabinetTestPage() {
  useEffect(() => {
    document.body.classList.add("cabinet-page", "cabinet-test-dark-gold");
    document.documentElement.setAttribute("data-theme", "dark");
    return () => {
      document.body.classList.remove("cabinet-page", "cabinet-test-dark-gold");
      const saved = typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;
      document.documentElement.setAttribute("data-theme", saved === "dark" ? "dark" : "light");
    };
  }, []);

  const displayName = "Иван Петров";
  const initials = "ИП";
  const balanceKop = 125430; // 1 254,30 ₽
  const tipLink = "https://free-tips.ru/pay/6c8mi5cuz1";
  const payoutUsageToday = { count: 1, sumKop: 50000 };
  const payoutLimits = { dailyLimitCount: 3, dailyLimitKop: 150000, monthlyLimitCount: 10, monthlyLimitKop: 500000 };
  const payoutUsageMonth = { count: 2, sumKop: 80000 };

  return (
    <div
      className="cabinet-premium cabinet-test-dark-gold flex min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-2"
      data-cabinet-theme="dark-gold"
    >
      {/* Небольшая плашка «тест» — не перекрывает шапку как на референсе */}
      <div className="cabinet-test-banner fixed top-16 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full border border-[var(--color-brand-gold)]/40 bg-[#111113]/95 px-4 py-1.5 text-xs font-medium text-[var(--color-brand-gold)] backdrop-blur-sm">
        <span>Тест</span>
        <Link href="/" className="text-white/80 hover:text-[var(--color-brand-gold)]">На главную</Link>
      </div>

      {/* Сайдбар — те же классы, что в реальном ЛК */}
      <div
        className="cabinet-sidebar hidden lg:flex fixed left-0 top-0 z-40 h-full w-[min(calc(100vw-4rem),20rem)] max-w-[20rem] flex-col overflow-hidden border-0 border-r border-[var(--color-brand-gold)]/15 py-6 shadow-2xl backdrop-blur-xl lg:static lg:ml-0 lg:mt-2 lg:mr-0 lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[260px] lg:max-w-none lg:rounded-[10px] lg:border lg:self-start"
      >
        <div
          className="cabinet-sidebar-profile cabinet-block-inner mx-4 rounded-[10px] border border-[var(--color-brand-gold)]/20 px-4 py-3 bg-[var(--color-dark-gray)]/10"
        >
          <div className="flex items-center gap-3">
            <div className="cabinet-sidebar-avatar flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-gold)] font-semibold text-[#0a192f] text-base">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-[var(--color-text)]">{displayName}</span>
                <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" aria-label="Верифицирован" />
              </div>
              <div className="text-sm text-[var(--color-text)]/80">Официант</div>
            </div>
          </div>
        </div>
        <div className="cabinet-nav-block mt-6 px-4">
          <p className="cabinet-nav-label mb-2 px-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/50">
            Навигация
          </p>
          <nav className="flex flex-col gap-0.5 rounded-[10px] border border-[var(--color-brand-gold)]/15 bg-[var(--color-dark-gray)]/5 p-1.5 shadow-[var(--shadow-subtle)]" aria-label="Навигация">
            {NAV.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 font-medium transition-colors ${
                  href === "/cabinet-test"
                    ? "cabinet-nav-active border border-[var(--color-brand-gold)]/30 bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] font-semibold"
                    : "border border-transparent text-[var(--color-text)]/80 hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="mt-4 flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-sm font-medium text-[var(--color-text)]/80 transition-colors hover:bg-[var(--color-dark-gray)]/10 hover:text-[var(--color-text)]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Выйти</span>
          </Link>
        </div>
      </div>

      <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-12 pb-4 md:px-4 lg:pl-0 lg:pr-4 lg:pt-12 flex flex-col">
        <div className="cabinet-main-block mt-0 mr-0 mb-4 ml-0 lg:mr-4 lg:ml-4 flex min-h-0 flex-1 w-full max-w-full flex-col rounded-xl border border-white/[0.08]">
          <div className="p-4 md:p-6 lg:p-8" id="main-content">
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Левая колонка: золотая карта — главный акцент (без серой обёртки), как на референсе */}
                <div className="cabinet-test-left flex flex-col gap-6">
                  <h2 className="text-lg font-semibold text-white">Официант</h2>
                  <div className="w-full max-w-[320px]">
                    <PremiumCard
                      fullName={displayName}
                      uniqueId="test-id-123"
                      balanceKop={balanceKop}
                      compact
                    />
                  </div>
                  <div className="cabinet-limits-block cabinet-verification-status rounded-xl border border-white/[0.12] bg-white/[0.04] p-5">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="font-semibold text-white">Аккаунт верифицирован!</span>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <ShieldCheck className="h-5 w-5" aria-hidden />
                        </div>
                      </div>
                      <p className="text-sm text-white/80">Ваша личность подтверждена.</p>
                    </div>
                  </div>
                  <div className="cabinet-limits-block rounded-xl border border-white/[0.12] bg-white/[0.04] p-5">
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/90">Доступные лимиты</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-white/70">Заявок в сутки</span>
                          <span className="font-medium text-white">{payoutUsageToday.count} из {payoutLimits.dailyLimitCount}</span>
                        </div>
                        <div className="cabinet-limits-track h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                            style={{ width: `${(payoutUsageToday.count / payoutLimits.dailyLimitCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-white/70">Сумма в сутки</span>
                          <span className="font-medium text-white">{formatMoney(BigInt(payoutUsageToday.sumKop))} из {formatMoney(BigInt(payoutLimits.dailyLimitKop))}</span>
                        </div>
                        <div className="cabinet-limits-track h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                            style={{ width: `${Math.min(100, (payoutUsageToday.sumKop / payoutLimits.dailyLimitKop) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Быстрые действия — панель как на референсе */}
                <div id="quick-actions" className="rounded-xl border border-white/[0.12] bg-white/[0.04] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.08]">
                    <h3 className="text-lg font-semibold text-white uppercase tracking-wide">Быстрые действия</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="rounded-xl border border-[var(--color-brand-gold)]/30 bg-white/[0.03] p-4">
                      <div className="mb-2 text-sm font-semibold text-white/90">Укажите цель, на которую собираете: 🎯</div>
                      <p className="mb-3 text-sm text-white/80">Новый ноутбук</p>
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--color-brand-gold)]/50 bg-transparent px-4 py-2 text-sm font-semibold text-[var(--color-brand-gold)] hover:bg-[var(--color-brand-gold)]/10 transition-colors"
                      >
                        Изменить
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc }) => (
                        <Link
                          key={title}
                          href={href}
                          className="cabinet-quick-action flex flex-col items-center rounded-xl border border-white/[0.12] bg-white/[0.04] p-5 transition-all hover:border-[var(--color-brand-gold)]/30 hover:bg-white/[0.06]"
                        >
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="font-semibold text-white text-center text-sm">{title}</div>
                          <div className="mt-1 text-center text-xs text-white/70">{desc}</div>
                        </Link>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/[0.12] bg-white/[0.03] p-4">
                      <div className="mb-2 text-sm font-semibold text-white/90">Ваша ссылка для чаевых</div>
                      <div className="mb-3 break-all rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 font-mono text-xs text-white/80">
                        {tipLink}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:opacity-90 transition-opacity"
                        >
                          <Copy className="h-4 w-4" />
                          Копировать ссылку
                        </button>
                        <a
                          href={tipLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:opacity-90 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Перейти по ссылке
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API ключ */}
              <div id="api-key" className="rounded-xl border border-white/[0.12] bg-white/[0.04] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.08]">
                  <h3 className="text-lg font-semibold text-white uppercase tracking-wide">API для уведомлений</h3>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-sm text-white/80">
                    Скопируйте ключ и введите его в приложении FreeTips — и управляйте личным кабинетом официанта из мобильного приложения. (только для Android)
                  </p>
                  <p className="mb-6 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-white/70">Приложение для Android:</span>
                    <a
                      href="/freetips.apk"
                      download="freetips.apk"
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:opacity-90 transition-opacity"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      Скачать приложение (APK)
                    </a>
                  </p>
                  <div className="rounded-xl border border-white/[0.12] bg-black/20 p-5">
                    <div className="mb-3 text-sm font-semibold text-white/90">Ваш API ключ</div>
                    <div className="mb-4 break-all rounded-lg border border-white/[0.12] bg-black/30 px-3 py-2 font-mono text-sm text-white/60">
                      •••••••••••••••••
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition-colors"
                      >
                        <Copy className="h-4 w-4 shrink-0" />
                        Копировать
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand-gold)] px-4 py-2 text-sm font-semibold text-[#0a192f] hover:opacity-90 transition-opacity"
                      >
                        <RotateCw className="h-4 w-4" />
                        Создать новый ключ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
