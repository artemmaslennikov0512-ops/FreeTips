"use client";

import Image from "next/image";
import { Smartphone, TrendingUp, QrCode, KeyRound } from "lucide-react";

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
    <section id="app" className="relative overflow-hidden w-full py-12 sm:py-16 lg:py-[100px] bg-[var(--color-charcoal)]">
      <div
        className="absolute inset-0 opacity-[0.04] z-[1]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><path d='M0,0 L80,0 L80,80' fill='none' stroke='white' stroke-width='1.5'/></svg>")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 xl:max-w-7xl 2xl:max-w-screen-2xl relative z-10">
        <div className="max-w-[700px] mx-auto mb-10 sm:mb-14 flex flex-col items-center text-center">
          <div className="flex flex-nowrap items-center justify-center gap-3 sm:gap-4 mb-4 w-full">
            <h2 className="font-[family:var(--font-playfair)] text-2xl sm:text-3xl lg:text-4xl font-semibold text-[#ffffff]">
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
                  <h3 className="font-[family:var(--font-playfair)] text-lg sm:text-xl font-semibold text-[#ffffff] mb-2">
                    {title}
                  </h3>
                  <p className="text-white/90 leading-relaxed text-sm sm:text-base">
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
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
        </div>
      </div>
    </section>
  );
}
