import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `Политика безопасности платежей — ${site.name}`,
  description: "Политика безопасности платежей при оплате банковскими картами через Paygine.",
};

const PAYMENT_LOGOS = [
  { src: "/payment-logos/visa.png", alt: "Visa" },
  { src: "/payment-logos/mastercard.png", alt: "Mastercard" },
  { src: "/payment-logos/mir.png", alt: "МИР" },
  { src: "/payment-logos/paygine.png", alt: "Paygine" },
] as const;

export default function PolitikaBezopasnostiPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 xl:max-w-4xl 2xl:max-w-5xl">
      <div className="mb-8 flex items-center gap-3">
        <img
          src={site.logo.src}
          alt={site.logo.alt}
          className="h-12 w-12"
        />
        <h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          Политика безопасности платежей
        </h1>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-6 rounded-xl border-0 bg-[var(--color-light-gray)] px-6 py-4">
        {PAYMENT_LOGOS.map(({ src, alt }) => (
          <img
            key={alt}
            src={src}
            alt={alt}
            className="h-10 object-contain"
          />
        ))}
      </div>

      <div className="prose prose-slate max-w-none space-y-4 text-[var(--color-text-secondary)]">
        <p>
          Оплатить заказ можно с помощью банковских карт платёжных систем Visa, MasterCard, МИР. При оплате банковской картой безопасность платежей гарантирует процессинговый центр Paygine.
        </p>
        <p>
          Приём платежей происходит через защищённое безопасное соединение, используя протокол TLS 1.2. Компания Paygine соответствует международным требованиям PCI DSS для обеспечения безопасной обработки реквизитов банковской карты плательщика. Ваши конфиденциальные данные, необходимые для оплаты (реквизиты карты, регистрационные данные и др.), не поступают в сервис {site.name}, их обработка производится на стороне процессингового центра Paygine и полностью защищена. Никто, в том числе сервис {site.name}, не может получить банковские и персональные данные плательщика.
        </p>
        <p>
          При оплате заказа банковской картой возврат денежных средств производится на ту же самую карту, с которой был произведён платёж.
        </p>
        <p>
          Информация о работе Компании в качестве платёжного агрегатора:{" "}
          <a
            href="https://paygine.ru/support/raschetnyy-bank/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline"
          >
            https://paygine.ru/support/raschetnyy-bank/
          </a>
        </p>
      </div>

      <div className="mt-12">
        <Link href="/" className="text-[var(--color-accent-gold)] font-medium hover:opacity-90 hover:underline">← На главную</Link>
      </div>
    </article>
  );
}
