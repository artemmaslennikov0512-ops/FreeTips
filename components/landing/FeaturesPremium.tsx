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
    <section id="features" className="relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-[var(--color-navy)]">
      <div
        className="absolute inset-0 z-[0] bg-cover bg-center bg-no-repeat opacity-[0.18]"
        style={{ backgroundImage: "url('/images/landing-pattern-features-trust-soft.png')" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.04] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl relative z-10">
        <div className="features-premium-intro max-w-[700px] mx-auto mb-10 sm:mb-16 flex flex-col items-center text-center">
          <h2 className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4 w-full">Надёжность, заслуживающая доверия</h2>
          <p className="text-lg text-[var(--color-on-dark-muted)] w-full">Мы создали сервис, который ценит время и труд как сотрудников, так и гостей.</p>
        </div>
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
            <div
              key={title}
              className="landing-card-hover features-premium-card relative p-6 sm:p-8 lg:p-10 bg-[var(--process-card-bg)] rounded-xl border border-[var(--process-card-border)] hover:border-[var(--process-card-hover-border)] flex flex-col items-center min-w-0"
            >
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-6 shrink-0 ${iconBg} ${iconColor} shadow-[0_4px_12px_rgba(0,0,0,0.15)]`}>
                <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-on-navy)] mb-4 w-full min-w-0 break-words">{title}</h3>
              <p className="text-[var(--color-on-dark-muted)] leading-relaxed w-full min-w-0">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
