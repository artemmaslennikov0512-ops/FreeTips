"use client";

import Image from "next/image";
import { Smartphone, TrendingUp, QrCode, KeyRound } from "lucide-react";
import {
  LANDING_DECO_GRID_LAYER,
  LANDING_DECO_GRID_STYLE,
  LANDING_DECO_PHOTO_BASE,
  LANDING_HEADING_H2,
  LANDING_SCROLL_MARGIN,
  LANDING_SECTION_INNER,
  LANDING_SECTION_Y,
} from "@/lib/landing-ui-classes";

const benefits = [
  {
    icon: TrendingUp,
    title: "Отслеживайте поступления",
    desc: "Вся история операций в приложении: баланс и пополнения в реальном времени.",
  },
  {
    icon: QrCode,
    title: "Показывайте QR-код гостям",
    desc: "Один экран — ссылка для приёма чаевых и QR. Гость сканирует и оплачивает без лишних шагов.",
  },
  {
    icon: KeyRound,
    title: "Подключение по API-ключу",
    desc: "Ключ генерируется в личном кабинете. Вводите его в приложении — и можно пользоваться.",
  },
];

export function AppPremium() {
  return (
    <section
      id="app"
      className={`relative w-full overflow-hidden bg-[var(--color-charcoal)] ${LANDING_SECTION_Y} [&_h2]:!text-white [&_h3]:!text-white ${LANDING_SCROLL_MARGIN}`}
    >
      <div
        className={`${LANDING_DECO_PHOTO_BASE} opacity-[0.18]`}
        style={{ backgroundImage: "url('/images/landing-pattern-app-soft.png')" }}
        aria-hidden
      />
      <div className={LANDING_DECO_GRID_LAYER} style={LANDING_DECO_GRID_STYLE} aria-hidden />
      <div className={LANDING_SECTION_INNER}>
        <div className="max-w-[700px] mx-auto mb-10 sm:mb-14 flex flex-col items-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-4 w-full min-w-0">
            <h2 className={`${LANDING_HEADING_H2} min-w-0 max-w-full text-center !text-white`}>
              Своё приложение FreeTips
            </h2>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-[rgba(197,165,114,0.2)] text-[var(--color-accent-gold)] shadow-[0_4px_12px_rgba(0,0,0,0.15)]" aria-hidden>
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          </div>
          <p className="text-lg text-white/90 w-full text-center">
            Вход по API-ключу из личного кабинета, QR для приёма чаевых и история поступлений — всё в одном приложении.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:gap-10">
          <div className="flex justify-center">
            <div className="relative w-full max-w-xl mx-auto">
              <Image
                src="/images/freetips-app-mockup-standing-hq.png"
                alt="Три экрана приложения FreeTips: вход по API-ключу, история операций и QR для приёма чаевых"
                width={960}
                height={640}
                className="w-full h-auto rounded-2xl border border-[var(--process-card-border)] shadow-2xl"
                sizes="(max-width: 640px) 100vw, 512px"
                priority
              />
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="landing-card-hover relative flex flex-col items-center text-center p-5 sm:p-5 rounded-xl bg-[var(--process-card-bg)] border border-[var(--process-card-border)] hover:border-[var(--process-card-hover-border)] transition-all duration-300 min-h-0"
              >
                <div className="absolute left-4 top-4 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 bg-[rgba(255,255,255,0.08)] text-[var(--color-accent-gold)]">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 w-full pt-10 sm:pt-11">
                  <h3 className="font-[family:var(--font-playfair)] text-lg sm:text-xl font-semibold !text-white mb-2">
                    {title}
                  </h3>
                  <p className="text-white/90 leading-relaxed text-sm sm:text-base">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
