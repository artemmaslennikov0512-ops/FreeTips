"use client";

import { UtensilsCrossed, Sparkles, Hotel } from "lucide-react";

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
    <section id="business" className="relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-[var(--color-charcoal)]">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><path d='M0,0 L120,0 L120,120' fill='none' stroke='white' stroke-width='2'/></svg>")`,
          backgroundSize: "120px 120px",
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl relative z-10">
        <div className="text-center max-w-[700px] mx-auto mb-10 sm:mb-16">
          <h2 className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4">Решение для серьёзного бизнеса</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)]">Инструмент, который повышает стандарты сервиса и мотивацию команды.</p>
        </div>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="relative p-6 sm:p-8 lg:p-10 rounded-xl bg-[var(--process-card-bg)] border border-[var(--process-card-border)] transition-all duration-300 hover:border-[var(--process-card-hover-border)]"
            >
              <h3 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                <span className="text-[var(--color-accent-gold)]">
                  <Icon className="w-6 h-6" />
                </span>
                {title}
              </h3>
              <p className="text-[var(--color-on-dark-muted)] leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
