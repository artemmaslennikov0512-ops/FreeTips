import Link from "next/link";

export function CTAPremium() {
  return (
    <section className="section-dark relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-charcoal)] text-[var(--color-on-navy)] text-center">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><path d='M0,0 L120,0 L120,120' fill='none' stroke='white' stroke-width='2'/></svg>")`,
          backgroundSize: "120px 120px",
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
            className="inline-flex items-center justify-center px-7 py-3 rounded-xl bg-[var(--color-white)] text-[var(--color-navy)] font-semibold text-[15px] hover:opacity-90 transition-all duration-300"
          >
            Начать бесплатно
          </Link>
          <Link
            href="/kontakty"
            className="inline-flex items-center justify-center px-7 py-3 rounded-xl border-0 text-[var(--color-on-navy)] font-semibold text-[15px] bg-transparent hover:opacity-90 transition-all duration-300"
          >
            Запросить демо
          </Link>
        </div>
      </div>
    </section>
  );
}
