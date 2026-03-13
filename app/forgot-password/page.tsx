"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, User } from "lucide-react";
import { AuthPageShell } from "@/components/AuthPageShell";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AUTH_CARD_CLASS, AUTH_INPUT_CLASS, AUTH_ERROR_BORDER, AUTH_BTN_PRIMARY } from "@/lib/auth-form-classes";
import { forgotPasswordRequestSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = forgotPasswordRequestSchema.safeParse({
      login: login.trim(),
      email: email.trim().toLowerCase(),
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(parsed.data),
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка запроса. Попробуйте позже.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ошибка соединения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell>
      <div className="forgot-password-page mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className={`${AUTH_CARD_CLASS} text-center`}>
          {/* Иконка, заголовок и описание — по центру */}
          <div className="forgot-password-header mx-auto max-w-full">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-gold)]/25 text-[var(--color-brand-gold)] ring-2 ring-[var(--color-brand-gold)]/50">
              <KeyRound className="h-6 w-6" strokeWidth={2} />
            </div>
            <h1 className="forgot-password-title text-2xl font-bold sm:text-3xl">
              Восстановление пароля
            </h1>
            <p className="forgot-password-desc mt-5 text-[var(--color-text-secondary)] max-w-md mx-auto">
              {success
                ? "На указанный email отправлена ссылка для сброса пароля. Проверьте почту и папку «Спам»."
                : "Укажите логин и почту — мы отправим ссылку на сброс пароля. Логин и email должны принадлежать одному аккаунту."}
            </p>
          </div>

          {!success && (
            <div className="text-left">
              {error && (
                <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-accent-red)]" role="alert">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Логин
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                    <input
                      id="login"
                      type="text"
                      autoComplete="username"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="Ваш логин"
                      className={`${AUTH_INPUT_CLASS} ${fieldErrors.login ? AUTH_ERROR_BORDER : ""}`}
                    />
                  </div>
                  <p className="forgot-password-tip mt-1 leading-snug text-[var(--color-text-secondary)]">
                    Логин можно вводить с большой или маленькой буквы.
                  </p>
                  {fieldErrors.login && (
                    <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.login}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className={`${AUTH_INPUT_CLASS} ${fieldErrors.email ? AUTH_ERROR_BORDER : ""}`}
                    />
                  </div>
                  <p className="forgot-password-tip mt-1 leading-snug text-[var(--color-text-secondary)]">
                    Это правильная почта? Проверьте перед отправкой.
                  </p>
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.email}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`${AUTH_BTN_PRIMARY} mt-4 flex w-full items-center justify-center`}
                >
                  {loading ? "Отправка…" : "Отправить ссылку"}
                </button>
              </form>
            </div>
          )}

          {success && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/login"
                className="auth-btn-primary inline-block rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 transition-all"
              >
                Вернуться к входу
              </Link>
            </div>
          )}
          <div className="mt-4 flex flex-col items-center gap-1">
            {!success && (
              <Link
                href="/login"
                className="text-sm text-white hover:opacity-90 transition-colors"
              >
                Вернуться к входу
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-[var(--color-brand-gold)] hover:opacity-90 transition-colors"
            >
              ← На главную
            </Link>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
