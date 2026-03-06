import Link from "next/link";

export function CTAPremium() {
  return (
    <section className="section-dark relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-charcoal)] text-[var(--color-on-navy)] text-center">
      <div
        className="absolute inset-0 opacity-[0.04] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl relative z-10">
        <div className="max-w-[700px] mx-auto mb-10">
          <h2 className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4 text-center">Готовы повысить стандарты?</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)] max-w-[600px] mx-auto mb-10">
            Присоединяйтесь к компаниям, которые уже используют FreeTips для развития культуры качественного сервиса.
          </p>
        </div>
        <div className="flex flex-wrap gap-5 justify-center">
          <Link
            href="/zayavka"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-[var(--color-white)] text-[var(--color-navy)] font-semibold text-[15px] transition-all duration-300 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:opacity-95"
          >
            Начать бесплатно
          </Link>
        </div>
      </div>
    </section>
  );
}
