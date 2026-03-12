"use client";

import Link from "next/link";

const METRICS = [
  {
    value: "99.8%",
    label: "Успешных транзакций",
    benefit: "Гости всегда могут сказать спасибо",
    icon: "fa-solid fa-circle-check",
  },
  {
    value: "<10 c",
    label: "Среднее время оплаты",
    benefit: "Не задерживаем очередь",
    icon: "fa-solid fa-clock",
  },
  {
    value: "24/7",
    label: "Поддержка клиентов",
    benefit: "Решим любой вопрос",
    icon: "fa-solid fa-headset",
  },
] as const;

const BRAND_FEATURES = [
  {
    icon: "fa-solid fa-qrcode",
    label: "Карточки под QR",
    desc: "Дизайн в фирменном стиле для печати (наклейки, меню, столы)",
  },
  {
    icon: "fa-solid fa-credit-card",
    label: "Страница оплаты",
    desc: "Брендированный интерфейс без лишних кнопок, гость не покидает атмосферу заведения",
  },
  {
    icon: "fa-solid fa-users",
    label: "Личные кабинеты",
    desc: "Для сотрудников (баланс, история) и администрации (аналитика, настройки)",
  },
] as const;

const PREVIEW_ITEMS = [
  { label: "Карточка", icon: "fa-solid fa-qrcode" },
  { label: "Оплата", icon: "fa-solid fa-mobile-screen" },
  { label: "Кабинет", icon: "fa-solid fa-user" },
] as const;

export function HeroPremium() {
  return (
    <section className="section-dark hero-premium-section relative overflow-hidden w-full bg-[var(--color-navy)] pt-[100px] pb-[48px] sm:pt-[120px] sm:pb-[60px]">
      {/* Градиент для глубины — без изменений */}
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:items-start gap-10 lg:gap-12 xl:gap-16">
          {/* Левая колонка: заголовок, подзаголовок, кнопки, метрики */}
          <div className="max-w-[640px] relative z-[2] flex flex-col">
            <h1 className="hero-premium-title hero-title-gradient font-[family:var(--font-inter)] text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] mb-4">
              Мгновенные чаевые с FreeTips
            </h1>
            <p className="hero-premium-lead text-lg text-[var(--color-on-dark-muted)] mb-6 max-w-[560px] leading-relaxed">
              Гость платит так, как привык — телефоном или картой. Мгновенно, без регистраций и приложений.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-0">
              <Link
                href="/zayavka"
                className="hero-btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[var(--color-navy)] font-bold text-[15px] shadow-[var(--shadow-button)] hover:-translate-y-0.5 hover:opacity-95 hover:scale-[1.02]"
              >
                Подключить заведение
              </Link>
              <Link
                href="/#features"
                className="hero-btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-[var(--color-on-dark-muted)]/50 text-[var(--color-on-navy)] font-semibold text-[15px] bg-transparent backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-[var(--color-accent-gold)]/60 hover:-translate-y-0.5 hover:scale-[1.02]"
              >
                Узнать больше
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 sm:gap-8 lg:gap-10 mt-8 pt-6 sm:mt-10 sm:pt-8 border-t border-white/10">
              {METRICS.map(({ value, label, benefit, icon }) => (
                <div key={label} className="hero-metric flex flex-col group">
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`${icon} text-[var(--color-accent-gold)] text-lg opacity-90 group-hover:opacity-100 transition-opacity duration-300`} aria-hidden />
                    <span className="hero-premium-stat font-[family:var(--font-inter)] text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-on-navy)] leading-none">
                      {value}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-on-navy)]">{label}</div>
                  <div className="text-xs text-[var(--color-on-dark-muted)] mt-0.5">{benefit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Правая колонка: Настраивайте под свой бренд — центрирование, настройки, превью, ссылка на заявку */}
          <div className="hero-brand-card mt-4 lg:mt-0 lg:shrink-0 lg:w-[340px] xl:w-[360px] relative z-[2] rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[var(--color-accent-gold)]/80 via-[var(--color-accent-gold)] to-[var(--color-accent-gold)]/60 relative z-10" aria-hidden />
            <div className="px-5 py-5 sm:px-6 sm:py-6 relative z-10 flex flex-col items-center">
              <h2 className="font-[family:var(--font-inter)] text-xl sm:text-2xl font-bold text-[var(--color-on-navy)] leading-tight mb-4 w-full text-center">
                Настраивайте под свой бренд
              </h2>

              <div className="w-full mb-5">
                <span className="text-xs font-semibold text-[var(--color-on-dark-muted)] uppercase tracking-wider">Настройки</span>
                <ul className="space-y-3 mt-3 text-left">
                  {BRAND_FEATURES.map(({ icon, label, desc }) => (
                    <li
                      key={label}
                      className="hero-brand-item flex items-start gap-3 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5 transition-all duration-300 hover:bg-white/[0.09] hover:border-white/20"
                    >
                      <span className="hero-brand-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] mt-0.5">
                        <i className={`${icon} text-sm`} aria-hidden />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-[var(--color-on-navy)]">{label}</span>
                        <span className="text-xs text-[var(--color-on-dark-muted)] leading-relaxed mt-0.5">{desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="w-full mb-5">
                <span className="text-xs font-semibold text-[var(--color-on-dark-muted)] uppercase tracking-wider">Превью</span>
                <div className="hero-preview-gallery mt-3 justify-center">
                  {PREVIEW_ITEMS.map(({ label, icon }) => (
                    <div
                      key={label}
                      className="hero-preview-card flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] aspect-square p-2"
                    >
                      <i className={`${icon} text-2xl text-[var(--color-accent-gold)]/80 mb-1`} aria-hidden />
                      <span className="text-[11px] sm:text-xs font-medium text-[var(--color-on-dark-muted)] text-center leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/zayavka"
                className="hero-btn-design block w-full text-center py-3 rounded-xl border-2 border-[var(--color-accent-gold)]/60 text-[var(--color-on-navy)] font-semibold text-[14px] backdrop-blur-sm hover:bg-[var(--color-accent-gold)]/25 hover:border-[var(--color-accent-gold)] hover:scale-[1.02] transition-transform"
              >
                Оставить заявку
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
