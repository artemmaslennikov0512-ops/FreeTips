"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="card-block flex max-w-md flex-col items-center rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 text-center shadow-[var(--shadow-card)]">
        <AlertTriangle className="h-14 w-14 shrink-0 text-[var(--color-muted)]" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Что-то пошло не так</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Не удалось загрузить страницу. Попробуйте ещё раз или вернитесь на главную.
        </p>
        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-gold)] px-5 py-2.5 text-sm font-medium text-[var(--color-navy)] hover:opacity-90 focus-visible:outline-none"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Повторить
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-light-gray)] focus-visible:outline-none"
          >
            <Home className="h-4 w-4" aria-hidden />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
