"use client";

import { UtensilsCrossed, Sparkles, Hotel } from "lucide-react";
import {
  LANDING_DECO_GRID_LAYER,
  LANDING_DECO_GRID_STYLE,
  LANDING_DECO_PHOTO_BASE,
  LANDING_HEADING_H2,
  LANDING_SCROLL_MARGIN,
  LANDING_SECTION_INNER,
  LANDING_SECTION_Y,
} from "@/lib/landing-ui-classes";

const cards = [
  {
    icon: UtensilsCrossed,
    title: "Рестораны и кафе",
    text: "Повысьте уровень сервиса и доход официантов с современным решением для чаевых, интегрируемым в ваш бренд.",
  },
  {
    icon: Sparkles,
    title: "Салоны красоты",
    text: "Оцените труд мастеров по достоинству. Клиенты легко благодарят специалистов за качественную работу.",
  },
  {
    icon: Hotel,
    title: "Отели и гостеприимство",
    text: "Создайте дополнительные возможности для вознаграждения персонала, повышая стандарты обслуживания.",
  },
];

export function BusinessPremium() {
  return (
    <section
      id="business"
      className={`relative w-full overflow-hidden bg-[var(--color-navy)] ${LANDING_SECTION_Y} ${LANDING_SCROLL_MARGIN}`}
    >
      <div
        className={`${LANDING_DECO_PHOTO_BASE} opacity-[0.18]`}
        style={{ backgroundImage: "url('/images/landing-pattern-business-sectors-soft.png')" }}
        aria-hidden
      />
      <div className={LANDING_DECO_GRID_LAYER} style={LANDING_DECO_GRID_STYLE} aria-hidden />
      <div className={LANDING_SECTION_INNER}>
        <div className="business-premium-header max-w-[700px] mx-auto mb-10 sm:mb-16">
          <h2 className={`${LANDING_HEADING_H2} mb-4 text-white`}>Решение для серьёзного бизнеса</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)]">Инструмент, который повышает стандарты сервиса и мотивацию команды.</p>
        </div>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="landing-card-hover business-premium-card relative p-6 sm:p-8 lg:p-10 rounded-xl bg-[var(--process-card-bg)] border border-[var(--process-card-border)] hover:border-[var(--process-card-hover-border)]"
            >
              <h3 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-white mb-4 flex flex-wrap items-center justify-center gap-3 text-center min-w-0">
                <span className="text-[var(--color-accent-gold)] shrink-0">
                  <Icon className="w-6 h-6" />
                </span>
                <span className="min-w-0 max-w-full">{title}</span>
              </h3>
              <p className="text-[var(--color-on-dark-muted)] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
