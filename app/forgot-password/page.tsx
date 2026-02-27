"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className="auth-page-card rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 shadow-[var(--shadow-card)] text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] ring-2 ring-[var(--color-accent-gold)]/40">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Восстановление пароля</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Функция восстановления пароля находится в разработке. Обратитесь в поддержку, если нужна помощь.
          </p>
          <Link
            href="/login"
            className="auth-btn-primary mt-6 inline-block rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 font-semibold text-[#0a192f] hover:opacity-90 transition-all"
          >
            Вернуться к входу
          </Link>
          <Link
            href="/"
            className="mt-4 block text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← На главную
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
