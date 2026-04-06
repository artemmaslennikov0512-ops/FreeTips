import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Безопасность платежей",
  description: "Как FreeTips обрабатывает оплату чаевых и где читать политику безопасности.",
};

export default function PomoshchBezopasnostPage() {
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
          Безопасность платежей
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Оплата проходит через подключённый платёжный провайдер; данные карты гость вводит в защищённой форме банка. Мы не
          просим гостя передавать реквизиты карты сотруднику вручную.
        </p>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Подробности — в{" "}
          <Link href="/politika-bezopasnosti" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            политике безопасности платежей
          </Link>
          ,{" "}
          <Link href="/politika" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            политике конфиденциальности
          </Link>{" "}
          и документах о возврате.
        </p>
      </article>
    </>
  );
}
