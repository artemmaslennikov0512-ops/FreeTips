/**
 * Резервная копия Hero-секции лендинга (до редизайна).
 * Чтобы вернуть: переименуйте этот файл в HeroPremium.tsx и замените текущий.
 */
import Link from "next/link";
import { Printer, Smartphone, LayoutDashboard } from "lucide-react";

const FLEX_ITEMS = [
  { icon: Printer, label: "Карточки под QR", desc: "Печать и дизайн" },
  { icon: Smartphone, label: "Страница оплаты", desc: "Для гостя" },
  { icon: LayoutDashboard, label: "Личные кабинеты", desc: "Заведение и сотрудники" },
] as const;

export function HeroPremium() {
  return (
    <section className="section-dark hero-premium-section relative overflow-hidden w-full bg-[var(--color-navy)] pt-[100px] pb-[48px] sm:pt-[120px] sm:pb-[60px]">
      {/* Градиент для глубины */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-navy)] via-transparent to-[var(--color-charcoal)]/30 pointer-events-none z-[1]" aria-hidden />
      <div
        className="absolute inset-0 opacity-[0.04] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between lg:gap-12 xl:gap-16">
          <div className="max-w-[640px] relative z-[2]">
            <h1 className="hero-premium-title font-[family:var(--font-playfair)] text-4xl sm:text-5xl lg:text-6xl font-semibold text-[var(--color-on-navy)] leading-[1.15] mb-4 flex flex-col">
              <span>Премиальные</span>
              <span className="pl-4 sm:pl-6">Чаевые</span>
              <span className="pl-8 sm:pl-12">Для</span>
              <span className="text-[var(--color-accent-gold)]">Профессионалов</span>
            </h1>
            <p className="hero-premium-lead text-lg text-[var(--color-on-dark-muted)] mb-6 max-w-[560px]">
              Безопасный и уважительный способ получать достойное вознаграждение за ваш труд. Технологии, которым доверяют ведущие заведения. Современный сервис.
            </p>
            <div className="flex flex-wrap gap-4 mb-0">
              <Link
                href="/zayavka"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[var(--color-accent-gold)] text-[var(--color-navy)] font-semibold text-[15px] transition-all duration-300 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-button-hover)] hover:-translate-y-0.5 hover:opacity-95"
              >
                Подключить заведение
              </Link>
              <Link
                href="/#features"
                className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl border border-[var(--color-on-dark-muted)]/40 text-[var(--color-on-navy)] font-semibold text-[15px] bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-[var(--color-accent-gold)]/50 hover:-translate-y-0.5"
              >
                Узнать больше
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 sm:gap-8 lg:gap-10 mt-8 pt-6 sm:mt-10 sm:pt-8 border-t border-white/10">
              <div className="flex flex-col">
                <div className="hero-premium-stat font-[family:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--color-on-navy)] leading-none">99.8%</div>
                <div className="text-sm text-[var(--color-on-dark-muted)] mt-2 font-medium">Успешных транзакций</div>
              </div>
              <div className="flex flex-col">
                <div className="hero-premium-stat font-[family:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--color-on-navy)] leading-none">&lt;10с</div>
                <div className="text-sm text-[var(--color-on-dark-muted)] mt-2 font-medium">Среднее время оплаты</div>
              </div>
              <div className="flex flex-col">
                <div className="hero-premium-stat font-[family:var(--font-playfair)] text-3xl sm:text-4xl font-bold text-[var(--color-on-navy)] leading-none">24/7</div>
                <div className="text-sm text-[var(--color-on-dark-muted)] mt-2 font-medium">Поддержка клиентов</div>
              </div>
            </div>
          </div>
          <div className="mt-10 lg:mt-0 lg:shrink-0 lg:w-[320px] xl:w-[340px] relative z-[2] rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* Декоративная полоска акцента сверху */}
            <div className="h-1 w-full bg-gradient-to-r from-[var(--color-accent-gold)]/80 via-[var(--color-accent-gold)] to-[var(--color-accent-gold)]/60" aria-hidden />
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <h2 className="font-[family:var(--font-playfair)] text-xl sm:text-2xl font-semibold text-[var(--color-on-navy)] leading-tight mb-1">
                Гибкие настройки под ваш бренд
              </h2>
              <p className="text-[13px] sm:text-[14px] text-[var(--color-on-dark-muted)] leading-relaxed mb-5">
                Всё в одном месте — превью в реальном времени.
              </p>
              <ul className="space-y-3 mb-5">
                {FLEX_ITEMS.map(({ icon: Icon, label, desc }) => (
                  <li key={label} className="flex items-center gap-3 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[var(--color-on-navy)]">{label}</span>
                      <span className="text-xs text-[var(--color-on-dark-muted)]">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {/* Мини-превью: стилизованная «карточка» с QR-сеткой */}
              <div className="rounded-xl border border-white/15 bg-white/[0.05] p-3 flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white/10" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-7 w-7 text-[var(--color-on-dark-muted)]/70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="0.5" />
                    <rect x="14" y="3" width="7" height="7" rx="0.5" />
                    <rect x="3" y="14" width="7" height="7" rx="0.5" />
                    <rect x="14" y="14" width="7" height="7" rx="0.5" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-[var(--color-on-dark-muted)] uppercase tracking-wider">Превью</span>
                  <p className="text-xs text-[var(--color-on-dark-muted)]/80 mt-0.5">Карточка, оплата и кабинет в едином стиле</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
