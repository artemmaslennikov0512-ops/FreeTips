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
    <div className="pay-success-always-light flex min-h-screen w-full flex-col items-center justify-center px-4 py-8">
      <div className="pay-success-card w-full max-w-sm rounded-2xl border border-[var(--color-brand-gold)]/40 bg-white p-8 text-center shadow-[var(--shadow-card)]">
        {success ? (
          <>
            <div className="pay-result-icon pay-result-icon-success mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-emerald)]/15">
              <CheckCircle2 className="h-9 w-9 text-[var(--color-accent-emerald)]" />
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
                Спасибо!
              </h1>
              <p className="mt-1 text-center text-lg font-medium text-[#0a192f]">Чаевые зачислены.</p>
              <p className="mt-3 text-center text-sm text-[#2d3748]">
                Получатель получил вашу благодарность.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="pay-result-icon pay-result-icon-error mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-red)]/15">
              <XCircle className="h-9 w-9 text-[var(--color-accent-red)]" />
            </div>
            <div className="mt-8 flex flex-col items-center text-center">
              <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[#0a192f]">
                Оплата не прошла
              </h1>
              <p className="mt-3 text-center text-sm text-[#2d3748]">
                Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя.
              </p>
            </div>
          </>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-[var(--color-navy)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)]/50"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
