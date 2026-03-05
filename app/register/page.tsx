"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, Mail } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AuthPageShell } from "@/components/AuthPageShell";
import { AUTH_CARD_CLASS, AUTH_INPUT_CLASS, AUTH_INPUT_CLASS_NO_ICON, AUTH_BTN_PRIMARY } from "@/lib/auth-form-classes";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    login: "",
    password: "",
    passwordConfirm: "",
    registrationToken: "",
    email: "",
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

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    if (tokenFromUrl) setFormData((prev) => ({ ...prev, registrationToken: tokenFromUrl }));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(formData),
        credentials: "include",
      });

      let data: {
        error?: string;
        details?: { path: string; message: string }[];
        accessToken?: string;
        user?: { id: string; login: string; email?: string | null; role: string };
      };
      try {
        data = await res.json();
      } catch {
        setError("Ошибка ответа сервера");
        return;
      }

      if (!res.ok) {
        setError(data?.error || "Ошибка при регистрации");
        return;
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        router.push("/cabinet");
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
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
          <div className={`${AUTH_CARD_CLASS} text-center`}>
            <p className="text-[var(--color-text-secondary)]">Проверка авторизации...</p>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className={AUTH_CARD_CLASS}>
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">Регистрация</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Создайте аккаунт для приёма чаевых
          </p>

          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-text-secondary)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="registrationToken"
                className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
              >
                Ссылка регистрации (токен)
              </label>
              <input
                id="registrationToken"
                type="text"
                required
                value={formData.registrationToken}
                onChange={(e) => setFormData({ ...formData, registrationToken: e.target.value })}
                placeholder="Вставьте токен из ссылки"
                className={AUTH_INPUT_CLASS_NO_ICON}
              />
            </div>
            <div>
              <label htmlFor="login" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Логин
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="login"
                  type="text"
                  required
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  placeholder="ivanov"
                  className={AUTH_INPUT_CLASS}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Латиница, цифры, подчёркивание, от 3 до 50 символов
              </p>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Email <span className="text-[var(--color-muted)]">(опционально)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ivan@example.com"
                  className={AUTH_INPUT_CLASS}
                />
              </div>
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
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Минимум 8 символов"
                  className={AUTH_INPUT_CLASS}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Минимум 8 символов, буква и цифра
              </p>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                Подтверждение пароля
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="passwordConfirm"
                  type="password"
                  required
                  minLength={8}
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  placeholder="Повторите пароль"
                  className={AUTH_INPUT_CLASS}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={AUTH_BTN_PRIMARY}
            >
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-[var(--color-accent-gold)] hover:opacity-90 hover:underline transition-colors">
              Войти
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

function RegisterFallback() {
  return (
    <AuthPageShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
        <div className={`${AUTH_CARD_CLASS} text-center`}>
          <p className="text-[var(--color-text-secondary)]">Загрузка...</p>
        </div>
      </div>
    </AuthPageShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
