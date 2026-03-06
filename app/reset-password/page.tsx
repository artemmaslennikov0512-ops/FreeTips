"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AUTH_CARD_CLASS, AUTH_INPUT_CLASS, AUTH_ERROR_BORDER, AUTH_BTN_PRIMARY } from "@/lib/auth-form-classes";
import { resetPasswordSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const currentToken = searchParams.get("token") ?? "";
    const parsed = resetPasswordSchema.safeParse({
      token: currentToken,
      newPassword,
      newPasswordConfirm,
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(parsed.data),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка сброса пароля. Попробуйте ещё раз или запросите новую ссылку.");
        return;
      }

      router.replace("/login?reset=success");
    } catch {
      setError("Ошибка соединения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenFromUrl) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className={`${AUTH_CARD_CLASS} text-center`}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] ring-2 ring-[var(--color-accent-gold)]/40">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Ссылка недействительна</h1>
          <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
            Перейдите по ссылке из письма или запросите сброс пароля заново.
          </p>
          <Link
            href="/forgot-password"
            className="auth-btn-primary mt-6 inline-block rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 font-semibold text-[#0a192f] hover:opacity-90 transition-all"
          >
            Запросить сброс пароля
          </Link>
          <Link href="/login" className="mt-4 block text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            ← К входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <div className={`${AUTH_CARD_CLASS} text-center`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] ring-2 ring-[var(--color-accent-gold)]/40">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Новый пароль</h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Введите новый пароль (не менее 8 символов, буква и цифра).
        </p>

        <form onSubmit={handleSubmit} className="mt-6 text-left">
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Новый пароль
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Минимум 8 символов, буква и цифра"
              className={`${AUTH_INPUT_CLASS} ${fieldErrors.newPassword ? AUTH_ERROR_BORDER : ""}`}
            />
            {fieldErrors.newPassword && (
              <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.newPassword}</p>
            )}
          </div>
          <div className="mt-4">
            <label htmlFor="newPasswordConfirm" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
              Подтверждение пароля
            </label>
            <input
              id="newPasswordConfirm"
              type="password"
              autoComplete="new-password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Повторите новый пароль"
              className={`${AUTH_INPUT_CLASS} ${fieldErrors.newPasswordConfirm ? AUTH_ERROR_BORDER : ""}`}
            />
            {fieldErrors.newPasswordConfirm && (
              <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.newPasswordConfirm}</p>
            )}
          </div>
          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-accent-red)]" role="alert">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className={`${AUTH_BTN_PRIMARY} mt-4 w-full`}>
            {loading ? "Сохранение…" : "Сохранить пароль"}
          </button>
        </form>

        <Link href="/login" className="mt-4 block text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
          ← К входу
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center">Загрузка…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
