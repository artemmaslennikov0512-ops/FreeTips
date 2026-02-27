"use client";

import { Shield, Zap, Handshake, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Безопасность прежде всего",
    desc: "Все транзакции защищены банковским уровнем шифрования. Ваши данные и средства находятся в полной безопасности.",
    iconBg: "bg-[rgba(255,255,255,0.12)]",
    iconColor: "text-[var(--color-on-navy)]",
  },
  {
    icon: Zap,
    title: "Мгновенное зачисление",
    desc: "Чаевые поступают на карту сотрудника сразу после оплаты. Без ожидания, комиссий или скрытых платежей.",
    iconBg: "bg-[rgba(197,165,114,0.2)]",
    iconColor: "text-[var(--color-accent-gold)]",
  },
  {
    icon: Handshake,
    title: "Профессиональное отношение",
    desc: "Мы уважаем труд каждого специалиста. Наш сервис создан, чтобы достойно вознаграждать профессионализм.",
    iconBg: "bg-[rgba(255,255,255,0.12)]",
    iconColor: "text-[var(--color-accent-emerald)]",
  },
  {
    icon: TrendingUp,
    title: "Прозрачная аналитика",
    desc: "Детальная статистика по всем операциям. Управляйте чаевыми и мотивацией сотрудников на основе данных.",
    iconBg: "bg-[rgba(255,255,255,0.12)]",
    iconColor: "text-[var(--color-on-dark-muted)]",
  },
];

export function FeaturesPremium() {
  return (
    <section id="features" className="relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-[var(--color-charcoal)]">
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
          <h2 className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4">Надёжность, заслуживающая доверия</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)]">Мы создали сервис, который ценит время и труд как сотрудников, так и гостей.</p>
        </div>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
            <div
              key={title}
              className="relative p-6 sm:p-8 lg:p-10 bg-[var(--process-card-bg)] rounded-xl border border-[var(--process-card-border)] transition-all duration-300 hover:border-[var(--process-card-hover-border)] text-center flex flex-col items-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${iconBg} ${iconColor}`}>
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-on-navy)] mb-4">{title}</h3>
              <p className="text-[var(--color-on-dark-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
