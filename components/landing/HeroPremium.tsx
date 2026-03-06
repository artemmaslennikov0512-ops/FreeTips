import Link from "next/link";

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
      </div>
    </section>
  );
}
