import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, History, KeyRound, QrCode, Smartphone } from "lucide-react";

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
      <article className="space-y-6">
        <header>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)]">
            <Smartphone className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-4 font-[family:var(--font-playfair)] text-3xl font-semibold text-[var(--color-text)] sm:text-4xl">
            Мобильное приложение
          </h1>
          <p className="mt-3 text-[var(--color-text-secondary)] leading-relaxed">
            Приложение FreeTips помогает сотруднику работать с чаевыми в одном месте: вход по API-ключу, показ QR гостю и
            просмотр истории операций.
          </p>
        </header>

        <ul className="list-none space-y-3 p-0">
          <li className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sides)] p-4 shadow-[var(--shadow-subtle)]">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-light-gray)] text-[var(--color-navy)]">
              <KeyRound className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-text)]">Вход по API-ключу</span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">
                Ключ создаётся в настройках профиля после регистрации и используется для авторизации в приложении.
              </span>
            </span>
          </li>
          <li className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sides)] p-4 shadow-[var(--shadow-subtle)]">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-light-gray)] text-[var(--color-navy)]">
              <QrCode className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-text)]">QR для приёма чаевых</span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">
                На экране доступен QR-код, который можно сразу показать гостю для быстрой оплаты.
              </span>
            </span>
          </li>
          <li className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-sides)] p-4 shadow-[var(--shadow-subtle)]">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-light-gray)] text-[var(--color-navy)]">
              <History className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-text)]">История операций</span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--color-text-secondary)]">
                В приложении можно отслеживать поступления и статус операций без перехода в кабинет.
              </span>
            </span>
          </li>
        </ul>

        <p className="text-[var(--color-text-secondary)] leading-relaxed">
          Актуальные способы установки (магазин приложений или APK) уточняйте в{" "}
          <Link href="/kontakty" className="text-[var(--color-accent-gold)] underline-offset-2 hover:underline">
            поддержке
          </Link>
          . Подскажем оптимальный вариант под вашу платформу.
        </p>
      </article>
    </>
  );
}
