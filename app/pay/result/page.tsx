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
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      {success ? (
        <>
          <CheckCircle2 className="h-16 w-16 text-[var(--color-text)]" />
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Спасибо! Чаевые зачислены.</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Получатель получил вашу благодарность.</p>
        </>
      ) : (
        <>
          <XCircle className="h-16 w-16 text-[var(--color-text-secondary)]" />
          <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Оплата не прошла</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Платёж был отклонён или отменён. Вы можете попробовать снова на странице получателя.
          </p>
        </>
      )}
      <Link
        href="/"
        className="mt-8 rounded-xl bg-[var(--color-accent-gold)] px-5 py-2.5 text-[var(--color-navy)] font-semibold hover:opacity-90"
      >
        На главную
      </Link>
    </div>
  );
}
