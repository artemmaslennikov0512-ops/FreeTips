import Link from "next/link";
import {
  LANDING_DECO_GRID_LAYER,
  LANDING_DECO_GRID_STYLE,
  LANDING_DECO_PHOTO_BASE,
  LANDING_HEADING_H2,
  LANDING_SECTION_INNER,
  LANDING_SECTION_Y,
} from "@/lib/landing-ui-classes";

export function CTAPremium() {
  return (
    <section
      className={`section-dark relative w-full overflow-hidden bg-gradient-to-br from-[var(--color-navy)] to-[var(--color-charcoal)] text-center text-[var(--color-on-navy)] ${LANDING_SECTION_Y}`}
    >
      <div
        className={`${LANDING_DECO_PHOTO_BASE} opacity-[0.18]`}
        style={{ backgroundImage: "url('/images/landing-pattern-cta-invite.png')" }}
        aria-hidden
      />
      <div className={LANDING_DECO_GRID_LAYER} style={LANDING_DECO_GRID_STYLE} aria-hidden />
      <div className={LANDING_SECTION_INNER}>
        <div className="cta-premium-block max-w-[700px] mx-auto mb-10 text-center">
          <h2 className={`${LANDING_HEADING_H2} mb-4 text-white`}>Готовы повысить стандарты?</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)] mx-auto mb-10 text-center max-w-[700px]">
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
