"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { AuthPageShell } from "@/components/AuthPageShell";
import { changePasswordSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { AUTH_CARD_CLASS, AUTH_BTN_PRIMARY } from "@/lib/auth-form-classes";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkMustChange = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const data = await res.json();
        if (!data.mustChangePassword) {
          // Если флаг сброшен, редиректим в ЛК или админку
          if (data.role === "ADMIN" || data.role === "SUPERADMIN") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/cabinet");
          }
          return;
        }
      } catch {
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    };

    checkMustChange();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      newPasswordConfirm,
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Не авторизован");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...getCsrfHeader(),
        },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка смены пароля");
        return;
      }

      // После успешной смены редиректим в ЛК или админку
      const profileRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile.role === "ADMIN" || profile.role === "SUPERADMIN") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/cabinet");
        }
      } else {
        router.replace("/cabinet");
      }
    } catch {
      setError("Ошибка смены пароля");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <AuthPageShell>
        <div className="flex min-h-[80vh] items-center justify-center px-4">
          <LoadingSpinner message="Загрузка…" className="min-h-[40vh]" />
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-gold)]/20 ring-2 ring-[var(--color-brand-gold)]/40">
              <AlertCircle className="h-8 w-8 text-[var(--color-brand-gold)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Обязательная смена пароля</h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Для безопасности необходимо сменить пароль перед продолжением работы.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={`${AUTH_CARD_CLASS} p-6`}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="currentPassword"
                  className="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                  Текущий пароль <span className="text-[var(--color-text-secondary)]">*</span>
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.currentPassword ? "" : ""
                  }`}
                  placeholder="Введите текущий пароль"
                />
                {fieldErrors.currentPassword && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                  Новый пароль <span className="text-[var(--color-text-secondary)]">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.newPassword ? "" : ""
                  }`}
                  placeholder="Минимум 8 символов, буква и цифра"
                />
                {fieldErrors.newPassword && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPasswordConfirm"
                  className="mb-2 block text-sm font-medium text-[var(--color-text)]"
                >
                  Подтверждение пароля <span className="text-[var(--color-text-secondary)]">*</span>
                </label>
                <input
                  id="newPasswordConfirm"
                  type="password"
                  autoComplete="new-password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] px-4 py-2.5 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.newPasswordConfirm ? "" : ""
                  }`}
                  placeholder="Повторите новый пароль"
                />
                {fieldErrors.newPasswordConfirm && (
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.newPasswordConfirm}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-0 bg-[var(--color-muted)]/10 p-4">
                  <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={AUTH_BTN_PRIMARY}
              >
                {loading ? "Смена пароля..." : "Сменить пароль"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthPageShell>
  );
}
