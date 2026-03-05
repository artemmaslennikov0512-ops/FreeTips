"use client";

import Link from "next/link";

export default function EstablishmentPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)] mb-2">
        Кабинет заведения
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-6">
        Управление командой, распределение чаевых и отчёты появятся здесь.
      </p>
      <div className="rounded-2xl border border-white/10 bg-[var(--color-navy)] p-6 text-center text-[var(--color-text-secondary)]">
        <p className="mb-4">Раздел в разработке.</p>
        <p className="text-sm">
          Скоро здесь будут: команда официантов, настройка приёма чаевых (на заведение или на каждого), отчётность и брендирование.
        </p>
        <Link
          href="/cabinet"
          className="mt-4 inline-block rounded-xl bg-[var(--color-brand-gold)] px-5 py-2.5 font-medium text-[#0a192f] hover:opacity-90"
        >
          В личный кабинет
        </Link>
      </div>
    </div>
  );
}
