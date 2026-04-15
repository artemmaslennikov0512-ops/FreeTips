"use client";

import { QrCode, SlidersHorizontal, Lock } from "lucide-react";
import {
  LANDING_DECO_GRID_LAYER,
  LANDING_DECO_GRID_STYLE,
  LANDING_DECO_PHOTO_BASE,
  LANDING_HEADING_H2,
  LANDING_SCROLL_MARGIN,
  LANDING_SECTION_INNER,
  LANDING_SECTION_Y,
} from "@/lib/landing-ui-classes";

const steps = [
  {
    num: "1",
    icon: QrCode,
    title: "Просканируйте QR-код",
    text: "Используйте камеру смартфона для сканирования персонального QR-кода сотрудника. Не требует установки приложений.",
  },
  {
    num: "2",
    icon: SlidersHorizontal,
    title: "Выберите сумму",
    text: "Укажите желаемый размер чаевых и при желании оставьте благодарность. Интерфейс адаптируется под ваш бренд.",
  },
  {
    num: "3",
    icon: Lock,
    title: "Безопасная оплата",
    text: "Подтвердите платеж через Apple Pay, Google Pay или картой. Транзакция защищена по стандартам PCI DSS.",
  },
];

export function ProcessPremium() {
  return (
    <section
      id="process"
      className={`section-dark relative w-full overflow-hidden bg-[var(--color-charcoal)] text-[var(--color-on-navy)] ${LANDING_SECTION_Y} ${LANDING_SCROLL_MARGIN}`}
    >
      <div
        className={`${LANDING_DECO_PHOTO_BASE} opacity-[0.18]`}
        style={{ backgroundImage: "url('/images/landing-pattern-process-steps-soft.png')" }}
        aria-hidden
      />
      <div className={LANDING_DECO_GRID_LAYER} style={LANDING_DECO_GRID_STYLE} aria-hidden />
      <div className={LANDING_SECTION_INNER}>
        <div className="process-premium-header max-w-[700px] mx-auto mb-10 sm:mb-16">
          <h2 className={`${LANDING_HEADING_H2} mb-4 text-white`}>Безупречный процесс</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)]">Три простых шага, которые отражают наше стремление к совершенству в каждой детали.</p>
        </div>
        <div className="grid gap-6 sm:gap-10 sm:grid-cols-3 mt-10 sm:mt-16">
          {steps.map(({ num, icon: Icon, title, text }) => (
            <div
              key={num}
              className="landing-card-hover relative p-6 sm:p-8 lg:p-10 bg-[var(--process-card-bg)] rounded-xl border border-[var(--process-card-border)] hover:border-[var(--process-card-hover-border)] transition-all duration-300 text-center"
            >
              <div className="absolute -top-4 left-8 w-10 h-10 bg-[var(--color-accent-gold)] text-[var(--color-navy)] rounded-full flex items-center justify-center font-[family:var(--font-playfair)] font-bold text-xl shadow-[var(--shadow-button)]">
                {num}
              </div>
              <div className="text-[var(--color-accent-gold)] mb-6">
                <Icon className="w-11 h-11 sm:w-12 sm:h-12" strokeWidth={1.5} />
              </div>
              <h3 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-white mb-4 text-center">{title}</h3>
              <p className="text-[var(--color-on-dark-muted)] leading-relaxed text-center">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
