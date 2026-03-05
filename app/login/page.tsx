"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AuthPageShell } from "@/components/AuthPageShell";
import { loginRequestSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";
import { AUTH_CARD_CLASS, AUTH_INPUT_CLASS, AUTH_ERROR_BORDER, AUTH_BTN_PRIMARY } from "@/lib/auth-form-classes";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    login: "",
    password: "",
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      setCheckingAuth(false);
      return;
    }
    fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.ok) {
          router.replace("/cabinet");
          return;
        }
        if (res.status === 401) localStorage.removeItem("accessToken");
        setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = loginRequestSchema.safeParse(formData);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(parsed.data),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка при входе");
        return;
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.mustChangePassword) {
          router.push("/change-password");
        } else if (data.user?.role === "ADMIN" || data.user?.role === "SUPERADMIN") {
            router.push("/admin/dashboard");
        } else {
          router.push("/cabinet");
        }
      }
    } catch {
      setError("Ошибка соединения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <AuthPageShell>
        <div className="mx-auto max-w-md px-4 py-16">
          <LoadingSpinner message="Проверка авторизации…" className="min-h-[40vh]" />
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className={AUTH_CARD_CLASS}>
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">Вход</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Войдите в личный кабинет для управления чаевыми
          </p>

          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-text-secondary)]">
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
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  placeholder="Ваш логин"
                  className={`${AUTH_INPUT_CLASS} ${fieldErrors.login ? AUTH_ERROR_BORDER : ""}`}
                />
              </div>
              {fieldErrors.login && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.login}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Введите пароль"
                  className={`${AUTH_INPUT_CLASS} ${fieldErrors.password ? AUTH_ERROR_BORDER : ""}`}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.password}</p>
              )}
              <Link
                href="/forgot-password"
                className="mt-1.5 block text-xs text-[var(--color-accent-gold)] hover:opacity-90 hover:underline transition-colors"
              >
                Забыли пароль?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${AUTH_BTN_PRIMARY} flex items-center justify-center gap-2`}
            >
              {loading ? "Вход..." : (
                <>
                  Войти
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            Нет аккаунта?{" "}
            <Link href="/zayavka" className="font-medium text-[var(--color-accent-gold)] hover:opacity-90 hover:underline transition-colors">
              Оставить заявку
            </Link>
          </div>

          <Link
            href="/"
            className="mt-4 block text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            ← На главную
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
