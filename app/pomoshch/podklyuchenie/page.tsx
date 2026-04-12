import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Как подключить заведение",
  description: "Шаги подключения FreeTips для заведения: заявка, согласование и настройка.",
};

export default function PomoshchPodklyucheniePage() {
  return (
    <>
      <Link
        href="/pomoshch"
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-accent-gold)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        База знаний
      </Link>
      <article>
        <h1 className="font-[family:var(--font-playfair)] text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">
          Как подключить заведение
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Оставьте заявку на странице{" "}
          <Link href="/zayavka" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            «Оставить заявку»
          </Link>
          , укажите телефон и почту. После обработки заявки вы получите доступ к настройкам бренда, QR и команде.
        </p>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Тарифы и обязательства сторон описаны в{" "}
          <Link href="/oferta" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            оферте
          </Link>{" "}
          и сопутствующих документах. Точные условия подключения согласуются при регистрации.
        </p>
      </article>
    </>
  );
}
