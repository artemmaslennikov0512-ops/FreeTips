"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Calendar, Building2, Phone, Briefcase, Mail } from "lucide-react";
import { site } from "@/config/site";
import { AuthPageShell } from "@/components/AuthPageShell";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { createRegistrationRequestSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";

export default function ZayavkaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    dateOfBirth: "",
    establishment: "",
    /** Только национальная часть (до 10 цифр), префикс +7 фиксирован */
    phone: "",
    activityType: "",
    email: "",
  });

  /** Форматирование национальной части: 10 цифр → (XXX) XXX-XX-XX */
  const formatPhoneNational = (digits: string): string => {
    const d = digits.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, "");
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) digits = digits.slice(1);
    setFormData((prev) => ({ ...prev, phone: digits.slice(0, 10) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      ...formData,
      phone: formData.phone ? `+7${formData.phone}` : "",
      establishment: formData.establishment || undefined,
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
        setError(data.error || "Ошибка при отправке заявки");
        return;
      }

      setSuccess(true);
      setFormData({ fullName: "", dateOfBirth: "", establishment: "", phone: "", activityType: "", email: "" });
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
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center overflow-visible px-4 py-16">
          <div className="rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 shadow-[var(--shadow-card)] text-center">
            <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">Спасибо за оставление заявки</h1>
            <p className="mt-3 text-[var(--color-text-secondary)]">
              Ожидайте, с вами свяжутся в рабочие часы.
            </p>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Если остались вопросы, можете написать нам на{" "}
              <a href={`mailto:${supportEmail}`} className="font-medium text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
                почту
              </a>
              .
            </p>
            <Link
              href="/login"
              className="auth-btn-primary mt-6 inline-block rounded-xl bg-[var(--color-brand-gold)] px-6 py-2.5 font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
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

  return (
    <AuthPageShell>
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center overflow-visible px-4 py-16">
        <div className="overflow-visible rounded-2xl border-0 bg-[var(--color-bg-sides)] p-8 shadow-[var(--shadow-card)]">
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">Оставить заявку</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            Заполните форму. На указанную почту будет выслана ссылка для регистрации после одобрения заявки.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-text-secondary)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section className="space-y-4" aria-labelledby="zayavka-contacts-heading">
              <h2 id="zayavka-contacts-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2">
                Контакты
              </h2>
            <div>
              <label htmlFor="zayavka-fullName" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">ФИО</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="zayavka-fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.fullName ? "" : ""
                  }`}
                />
              </div>
              {fieldErrors.fullName && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="zayavka-dateOfBirth" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Дата рождения</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="zayavka-dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.dateOfBirth ? "" : ""
                  }`}
                />
              </div>
              {fieldErrors.dateOfBirth && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.dateOfBirth}</p>}
            </div>

            <div>
              <label htmlFor="zayavka-phone" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Номер телефона</label>
              <div className={`relative flex rounded-xl border-0 bg-[var(--color-light-gray)] overflow-hidden focus-within:outline-none ${
                fieldErrors.phone ? "" : ""
              }`}>
                <span className="flex items-center gap-1 pl-3 text-[var(--color-text)]" aria-hidden="true">
                  <Phone className="h-5 w-5 text-[var(--color-muted)]" />
                  <span className="font-medium text-[var(--color-text)]">+7</span>
                </span>
                <input
                  id="zayavka-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  value={formatPhoneNational(formData.phone)}
                  onChange={handlePhoneChange}
                  placeholder="(999) 123-45-67"
                  className={`flex-1 min-w-0 py-2.5 pr-4 pl-1 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none border-0 bg-transparent ${
                    fieldErrors.phone ? "placeholder:text-[var(--color-text-secondary)]" : ""
                  }`}
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
              </div>
              {fieldErrors.phone && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label htmlFor="zayavka-email" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Почта</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="zayavka-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.email ? "" : ""
                  }`}
                />
              </div>
              {fieldErrors.email && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.email}</p>}
              <p className="mt-1 text-xs text-[var(--color-muted)]">На неё будет выслана ссылка для регистрации (токен)</p>
            </div>
            </section>

            <section className="space-y-4" aria-labelledby="zayavka-activity-heading">
              <h2 id="zayavka-activity-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2">
                Деятельность и заведение
              </h2>
            <div>
              <label htmlFor="zayavka-activityType" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Вид деятельности</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="zayavka-activityType"
                  type="text"
                  value={formData.activityType}
                  onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                  placeholder="Официант, курьер, мастер"
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.activityType ? "" : ""
                  }`}
                />
              </div>
              {fieldErrors.activityType && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.activityType}</p>}
            </div>

            <div>
              <label htmlFor="zayavka-establishment" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Заведение (если есть)</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  id="zayavka-establishment"
                  type="text"
                  value={formData.establishment}
                  onChange={(e) => setFormData({ ...formData, establishment: e.target.value })}
                  placeholder="Название кафе, ресторана"
                  className={`w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:outline-none ${
                    fieldErrors.establishment ? "" : ""
                  }`}
                />
              </div>
              {fieldErrors.establishment && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{fieldErrors.establishment}</p>}
            </div>
            </section>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn-primary w-full rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? "Отправка..." : "Оставить заявку"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
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
