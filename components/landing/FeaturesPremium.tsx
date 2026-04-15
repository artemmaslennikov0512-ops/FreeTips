"use client";

import { Shield, Zap, Handshake, TrendingUp } from "lucide-react";
import {
  LANDING_DECO_GRID_LAYER,
  LANDING_DECO_GRID_STYLE,
  LANDING_DECO_PHOTO_BASE,
  LANDING_HEADING_H2,
  LANDING_SCROLL_MARGIN,
  LANDING_SECTION_INNER,
  LANDING_SECTION_Y,
} from "@/lib/landing-ui-classes";

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
    <section
      id="features"
      className={`relative w-full overflow-hidden bg-[var(--color-navy)] ${LANDING_SECTION_Y} ${LANDING_SCROLL_MARGIN}`}
    >
      <div
        className={`${LANDING_DECO_PHOTO_BASE} opacity-[0.18]`}
        style={{ backgroundImage: "url('/images/landing-pattern-features-trust-soft.png')" }}
        aria-hidden
      />
      <div className={LANDING_DECO_GRID_LAYER} style={LANDING_DECO_GRID_STYLE} aria-hidden />
      <div className={LANDING_SECTION_INNER}>
        <div className="features-premium-intro max-w-[700px] mx-auto mb-10 sm:mb-16 flex flex-col items-center text-center">
          <h2 className={`${LANDING_HEADING_H2} mb-4 w-full text-white`}>Надёжность, заслуживающая доверия</h2>
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
