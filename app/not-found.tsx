import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="card-block flex flex-col items-center rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 text-center max-w-md shadow-[var(--shadow-card)]">
        <FileQuestion className="h-14 w-14 text-[var(--color-muted)] shrink-0" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">404 — Страница не найдена</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-gold)] px-5 py-2.5 text-sm font-medium text-[var(--color-navy)] hover:opacity-90 focus-visible:outline-none"
        >
          <Home className="h-4 w-4" />
          На главную
        </Link>
      </div>
    </div>
  );
}
