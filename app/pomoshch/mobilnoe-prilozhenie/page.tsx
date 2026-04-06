import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Мобильное приложение",
  description: "Приложение FreeTips: API-ключ из кабинета, QR для чаевых и история поступлений.",
};

export default function PomoshchPrilozheniePage() {
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
          Мобильное приложение
        </h1>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          В приложении можно войти по API-ключу из личного кабинета, показать гостю QR для приёма чаевых и отслеживать историю
          операций. Ключ создаётся в настройках профиля после регистрации.
        </p>
        <p className="mt-4 text-[var(--color-text-secondary)] leading-relaxed">
          Актуальные способы установки (магазин приложений или APK) уточняйте в{" "}
          <Link href="/kontakty" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            поддержке
          </Link>
          — мы подскажем под вашу платформу.
        </p>
      </article>
    </>
  );
}
