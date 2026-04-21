"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { site } from "@/config/site";
import { AuthPageShell } from "@/components/AuthPageShell";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { createRegistrationRequestSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";
import { AUTH_CARD_CLASS } from "@/lib/auth-form-classes";

const initialFormData = {
  email: "",
  phone: "",
  consentOfferAndPolicy: false,
};

export default function ZayavkaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      consentOfferAndPolicy: formData.consentOfferAndPolicy as true,
    };

    const parsed = createRegistrationRequestSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/registration-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeader() },
        body: JSON.stringify(parsed.data),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const details = data.details as Array<{ path?: (string | number)[]; message?: string }> | undefined;
        if (Array.isArray(details)) {
          const next: Record<string, string> = {};
          for (const d of details) {
            const key = d.path?.[0];
            if (typeof key === "string" && d.message) next[key] = d.message;
          }
          if (Object.keys(next).length > 0) setFieldErrors((prev) => ({ ...prev, ...next }));
        }
        setError(data.error || "Ошибка при отправке заявки");
        return;
      }

      setSuccess(true);
      setFormData(initialFormData);
    } catch {
      setError("Ошибка соединения. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const supportEmail = site.footer.support.email;
    return (
      <AuthPageShell>
        <div className="zayavka-page mx-auto flex min-h-[80vh] max-w-md flex-col justify-center overflow-visible px-4 py-16">
          <div className={`${AUTH_CARD_CLASS} zayavka-card text-center`}>
            <h1 className="text-center font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">
              Спасибо, заявка отправлена
            </h1>
            <p className="mt-3 text-center text-[var(--color-text-secondary)]">
              Ожидайте, с вами свяжутся в рабочие часы.
            </p>
            <p className="mt-2 text-center text-[var(--color-text-secondary)]">
              Если остались вопросы, можете написать нам на{" "}
              <a href={`mailto:${supportEmail}`} className="font-medium text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
                почту
              </a>
              .
            </p>
            <Link
              href="/login"
              className="auth-btn-primary mt-6 inline-block rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 text-[14px] font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
            >
              К странице входа
            </Link>
            <Link href="/" className="mt-4 block text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
              ← На главную
            </Link>
          </div>
        </div>
      </AuthPageShell>
    );
  }

  const inputBase =
    "w-full rounded-xl border-0 bg-white py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] caret-[var(--color-text)] focus:outline-none";

  return (
    <AuthPageShell>
      <div className="zayavka-page mx-auto flex min-h-[80vh] max-w-md flex-col justify-center overflow-visible px-4 py-16">
        <div className={`${AUTH_CARD_CLASS} zayavka-card min-w-0 overflow-visible`}>
          <h1 className="text-center font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">Оставить заявку</h1>

          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-accent-red)]" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 min-w-0 space-y-5">
            <div>
              <label htmlFor="zayavka-phone" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">
                Телефон
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
                <input
                  id="zayavka-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 900 000-00-00"
                  className={inputBase}
                  autoComplete="tel"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-center text-xs text-[var(--color-accent-red)]" role="alert">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="zayavka-email" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">
                Почта
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
                <input
                  id="zayavka-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={inputBase}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-center text-xs text-[var(--color-accent-red)]" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[var(--color-muted)]/5 p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.consentOfferAndPolicy}
                  onChange={(e) => setFormData({ ...formData, consentOfferAndPolicy: e.target.checked })}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--color-muted)] text-[var(--color-brand-gold)] focus:ring-[var(--color-brand-gold)]/50"
                />
                <span className="text-sm leading-snug text-[var(--color-text-secondary)]">
                  <span className="text-red-400">*</span> Согласен(на) на обработку персональных данных —{" "}
                  <Link href="/politika" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline" target="_blank" rel="noopener noreferrer">
                    политика ПДн
                  </Link>
                  ,{" "}
                  <Link href="/oferta" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline" target="_blank" rel="noopener noreferrer">
                    оферта
                  </Link>
                  ,{" "}
                  <Link href="/politika-bezopasnosti" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline" target="_blank" rel="noopener noreferrer">
                    платежи
                  </Link>
                  .
                </span>
              </label>
              {fieldErrors.consentOfferAndPolicy && (
                <p className="mt-1 text-sm text-[var(--color-accent-red)]" role="alert">
                  {fieldErrors.consentOfferAndPolicy}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !formData.consentOfferAndPolicy}
              className="auth-btn-primary w-full rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 text-[14px] font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
            >
              {loading ? "Отправка..." : "Оставить заявку"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-white">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-[var(--color-accent-gold)] hover:opacity-90 hover:underline transition-colors">
              Войти
            </Link>
          </div>

          <Link href="/" className="mt-4 block text-center text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            ← На главную
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
