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

/** Тестовая страница дизайна ЛК: те же классы и структура, mock-данные, без авторизации. */
export default function CabinetTestPage() {
  useEffect(() => {
    document.body.classList.add("cabinet-page");
    return () => document.body.classList.remove("cabinet-page");
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
      className="cabinet-premium flex min-h-screen w-full max-w-full overflow-x-hidden bg-[var(--color-bg)] font-[family:var(--font-inter)] text-[var(--color-text)] pt-2"
    >
      {/* Баннер: тестовый дизайн */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-amber-500/95 px-4 py-2 text-sm font-semibold text-[#0a192f] shadow-md">
        <span>Тестовый дизайн ЛК — для экспериментов с оформлением</span>
        <Link
          href="/"
          className="rounded-lg bg-[#0a192f] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          На главную
        </Link>
      </div>

      {/* Сайдбар — те же классы, что в реальном ЛК */}
      <div
        className="cabinet-sidebar hidden lg:flex fixed left-0 top-0 z-40 h-full w-[min(calc(100vw-4rem),20rem)] max-w-[20rem] flex-col overflow-hidden border-0 border-r border-white/10 py-6 shadow-2xl backdrop-blur-xl lg:static lg:ml-0 lg:mt-2 lg:mr-0 lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-2rem)] lg:w-[260px] lg:max-w-none lg:rounded-[10px] lg:border lg:self-start"
        style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
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
                    ? "cabinet-nav-active border border-[#0a192f]/25 bg-[#0a192f]/10 text-[#0a192f] font-semibold"
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

      <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden px-0 pt-14 pb-4 md:px-4 lg:pl-0 lg:pr-4 lg:pt-14 flex flex-col">
        <div
          className="cabinet-main-block mt-0 mr-0 mb-4 ml-0 lg:mr-4 lg:ml-4 flex min-h-0 flex-1 w-full max-w-full flex-col rounded-lg md:rounded-[10px] border border-white/10 backdrop-blur-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="p-4 md:p-6 lg:p-8" id="main-content">
            <div className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Карточка с балансом */}
                <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-[320px] flex flex-col items-center">
                        <p className="w-full text-center text-lg font-semibold text-white mb-3">
                          {displayName}
                        </p>
                        <div className="w-full overflow-hidden">
                          <PremiumCard
                            fullName={displayName}
                            uniqueId="test-id-123"
                            balanceKop={balanceKop}
                            compact
                          />
                        </div>
                      </div>
                    </div>

                    {/* Верификация — mock */}
                    <div className="cabinet-limits-block cabinet-verification-status mt-6 w-full rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-5">
                      <div className="flex w-full flex-col items-center gap-2 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <span className="font-semibold leading-none text-white">Аккаунт верифицирован!</span>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-500">
                            <ShieldCheck className="h-5 w-5" aria-hidden />
                          </div>
                        </div>
                        <p className="w-full text-center text-sm text-white">Ваша личность подтверждена.</p>
                      </div>
                    </div>

                    {/* Лимиты — mock */}
                    <div className="cabinet-limits-block mt-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-5">
                      <h4 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Доступные лимиты</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Заявок в сутки</span>
                            <span className="font-medium text-[var(--color-text)]">
                              {payoutUsageToday.count} из {payoutLimits.dailyLimitCount}
                            </span>
                          </div>
                          <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                            <div
                              className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                              style={{ width: `${(payoutUsageToday.count / payoutLimits.dailyLimitCount) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="cabinet-limits-label text-[var(--color-text-secondary)]">Сумма в сутки</span>
                            <span className="font-medium text-[var(--color-text)]">
                              {formatMoney(BigInt(payoutUsageToday.sumKop))} из {formatMoney(BigInt(payoutLimits.dailyLimitKop))}
                            </span>
                          </div>
                          <div className="cabinet-limits-track h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-dark-gray)]/20">
                            <div
                              className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                              style={{ width: `${Math.min(100, (payoutUsageToday.sumKop / payoutLimits.dailyLimitKop) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Быстрые действия */}
                <div id="quick-actions" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
                  <div className="border-0 px-6 py-4 text-center">
                    <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)] text-center">
                      Быстрые действия
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="cabinet-block-inner mb-6 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
                      <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Укажите цель, на которую собираете: 🎯</div>
                      <p className="mb-3 text-[14px] text-[var(--color-text)]">Новый ноутбук</p>
                      <button
                        type="button"
                        className="rounded-[10px] border border-[var(--color-brand-gold)]/40 bg-transparent px-4 py-2 text-[14px] font-semibold text-[var(--color-brand-gold)] transition-all hover:bg-[var(--color-brand-gold)]/15"
                      >
                        Изменить
                      </button>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-4">
                      {QUICK_ACTIONS.map(({ href, icon: Icon, title, desc }) => (
                        <Link
                          key={title}
                          href={href}
                          className="cabinet-block-inner flex flex-col items-center rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6 transition-all hover:bg-[var(--color-accent-gold)]/15 hover:-translate-y-1 shadow-[var(--shadow-subtle)]"
                        >
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-gold)] text-[#0a192f]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="font-semibold text-[var(--color-text)] text-center">{title}</div>
                          <div className="mt-1 text-center text-sm text-[var(--color-text)]/90">{desc}</div>
                        </Link>
                      ))}
                    </div>

                    <div className="cabinet-block-inner rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-4">
                      <div className="mb-2 text-sm font-semibold text-[var(--color-text)]">Ваша ссылка для чаевых</div>
                      <div className="cabinet-input-window mb-3 break-all rounded-lg bg-[var(--color-bg-sides)] px-3 py-2 font-mono text-xs text-[var(--color-text)]/90">
                        {tipLink}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90"
                        >
                          <Copy className="h-4 w-4" />
                          Копировать ссылку
                        </button>
                        <a
                          href={tipLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cabinet-card-btn-link inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-4 py-2 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Перейти по ссылке
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API ключ — mock */}
              <div id="api-key" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
                <div className="border-0 px-6 py-4">
                  <h3 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">
                    API для уведомлений
                  </h3>
                </div>
                <div className="p-6">
                  <p className="mb-4 text-[var(--color-text)]/90">
                    Скопируйте ключ и введите его в приложении FreeTips — и управляйте личным кабинетом официанта из мобильного приложения. (только для Android)
                  </p>
                  <p className="mb-6 flex flex-wrap items-center gap-3">
                    <span className="text-[var(--color-text)]/90">Приложение для Android:</span>
                    <a
                      href="/freetips.apk"
                      download="freetips.apk"
                      className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] transition-all hover:opacity-90"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      Скачать приложение (APK)
                    </a>
                  </p>
                  <div className="cabinet-block-inner rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/6 p-5">
                    <div className="mb-4 text-sm font-semibold text-[var(--color-text)]">Ваш API ключ</div>
                    <div className="cabinet-input-window cabinet-block-inner mb-4 break-all rounded-md border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 px-3 py-3 font-mono text-sm text-[var(--color-text-secondary)]">
                      •••••••••••••••••
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-brand-gold)]/20 bg-[var(--color-bg-sides)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] shadow-sm transition-all hover:bg-[var(--color-light-gray)]"
                      >
                        <Copy className="h-4 w-4 shrink-0" />
                        Копировать
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90"
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
