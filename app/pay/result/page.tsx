/**
 * Страница результата оплаты (success/fail).
 * Paygine редиректит сюда: /pay/result?tid=...&outcome=success|fail
 */

import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

type SearchParams = { tid?: string; outcome?: string };

export default async function PayResultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { outcome } = await searchParams;
  const success = outcome === "success";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/25 bg-[var(--color-bg-sides)] p-8 text-center shadow-[var(--shadow-card)]">
        {success ? (
          <>
            <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
              <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
            </div>
            <h1 className="mt-5 font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">
              Спасибо!
            </h1>
            <p className="mt-1 text-lg font-medium text-[var(--color-text)]">Чаевые зачислены.</p>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Получатель получил вашу благодарность.
            </p>
          </>
        ) : (
          <>
            <div className="pay-result-icon pay-result-icon-error mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15">
              <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
            </div>
            <h1 className="mt-5 text-xl font-semibold text-[var(--color-text)]">Оплата не прошла</h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
