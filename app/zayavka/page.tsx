"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Calendar, Building2, Phone, Briefcase, Mail, Users, ArrowRight, ArrowLeft } from "lucide-react";
import { site } from "@/config/site";
import { AuthPageShell } from "@/components/AuthPageShell";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { createRegistrationRequestSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";
import { AUTH_CARD_CLASS } from "@/lib/auth-form-classes";

type RequestType = "establishment" | "individual";

const initialFormData = {
  requestType: "individual" as RequestType,
  fullName: "",
  dateOfBirth: "",
  establishment: "",
  phone: "",
  activityType: "",
  email: "",
  companyName: "",
  companyRole: "",
  employeeCount: "",
  adminFullName: "",
  adminContactPhone: "",
};

/** Валидация только полей шага 1 (личные данные) */
function validateStep1(
  data: typeof initialFormData,
  isEstablishment: boolean,
): Record<string, string> {
  const err: Record<string, string> = {};
  if (!data.fullName.trim()) err.fullName = "Укажите ФИО";
  else if (data.fullName.trim().length > 255) err.fullName = "Слишком длинное значение";
  const digits = data.phone.replace(/\D/g, "");
  if (digits.length !== 10) err.phone = "Укажите номер телефона (10 цифр)";
  if (!data.email.trim()) err.email = "Укажите email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) err.email = "Неверный формат email";
  if (!isEstablishment && !data.dateOfBirth.trim()) err.dateOfBirth = "Укажите дату рождения";
  return err;
}

export default function ZayavkaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [step, setStep] = useState<1 | 2>(1);

  /** Форматирование национальной части: 10 цифр → (XXX) XXX-XX-XX */
  const formatPhoneNational = (digits: string): string => {
    const d = digits.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  };

  const normalizePhoneDigits = (value: string): string => {
    let digits = value.replace(/\D/g, "");
    if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) digits = digits.slice(1);
    return digits.slice(0, 10);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: "phone" | "adminContactPhone") => {
    const digits = normalizePhoneDigits(e.target.value);
    setFormData((prev) => ({ ...prev, [field]: digits }));
  };

  const handleRequestTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as RequestType;
    setFormData((prev) => ({ ...prev, requestType: v }));
    setFieldErrors({});
    setStep(1);
  };

  const isEstablishment = formData.requestType === "establishment";

  const handleNext = () => {
    setError(null);
    const step1Errors = validateStep1(formData, isEstablishment);
    if (Object.keys(step1Errors).length > 0) {
      setFieldErrors(step1Errors);
      return;
    }
    setFieldErrors({});
    setStep(2);
  };

  const handleBack = () => {
    setError(null);
    setFieldErrors({});
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const isEstablishment = formData.requestType === "establishment";
    const payload = isEstablishment
      ? {
          requestType: "establishment" as const,
          fullName: formData.fullName.trim(),
          companyName: formData.companyName.trim(),
          companyRole: formData.companyRole.trim(),
          phone: formData.phone ? `+7${formData.phone}` : "",
          email: formData.email.trim(),
          employeeCount: formData.employeeCount === "" ? 0 : Number(formData.employeeCount),
        }
      : {
          requestType: "individual" as const,
          fullName: formData.fullName.trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone ? `+7${formData.phone}` : "",
          email: formData.email.trim(),
          activityType: formData.activityType.trim(),
          establishment: formData.establishment.trim() || undefined,
          adminFullName: formData.adminFullName.trim(),
          adminContactPhone: formData.adminContactPhone ? `+7${formData.adminContactPhone}` : "",
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

  const inputBase = "w-full rounded-xl border-0 bg-[var(--color-light-gray)] py-2.5 pl-10 pr-4 text-[var(--color-text)] placeholder:text-[var(--color-muted)] caret-[var(--color-text)] focus:outline-none";
  const phoneInputBase = "flex-1 min-w-0 py-2.5 pr-4 pl-1 text-[var(--color-text)] placeholder:text-[var(--color-muted)] caret-[var(--color-text)] focus:outline-none border-0 bg-transparent";

  return (
    <AuthPageShell>
      <div className="zayavka-page mx-auto flex min-h-[80vh] max-w-md flex-col justify-center overflow-visible px-4 py-16">
        <div className={`${AUTH_CARD_CLASS} zayavka-card min-w-0 overflow-visible`}>
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)] text-center">Оставить заявку</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">
            {step === 1
              ? "Сначала укажите тип подключения и контактные данные."
              : "Заполните данные о заведении и контакте для подтверждения."}
          </p>

          {/* Индикатор шагов */}
          <div className="mt-4 flex items-center gap-2" aria-label="Прогресс формы">
            <span className="text-sm font-medium text-[var(--color-muted)]">Шаг {step} из 2</span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-light-gray)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-brand-gold)] transition-all duration-300"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border-0 bg-[var(--color-muted)]/10 p-3 text-sm text-[var(--color-accent-red)]" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 min-w-0 space-y-6">
            {step === 1 && (
              <>
                <section className="space-y-4" aria-labelledby="zayavka-type-heading">
                  <h2 id="zayavka-type-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2 text-center">
                    Тип подключения
                  </h2>
                  <div>
                    <label htmlFor="zayavka-requestType" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">
                      Подключается
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none z-10" />
                      <select
                        id="zayavka-requestType"
                        value={formData.requestType}
                        onChange={handleRequestTypeChange}
                        className={`${inputBase} appearance-none cursor-pointer pl-10 pr-10`}
                        aria-describedby="zayavka-requestType-desc"
                      >
                        <option value="establishment">Заведение</option>
                        <option value="individual">Получатель чаевых</option>
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-muted)]" aria-hidden="true">▼</span>
                    </div>
                    <p id="zayavka-requestType-desc" className="zayavka-hint mt-1 text-center text-[var(--color-muted)]">
                      {isEstablishment ? "Данные компании и контактного лица" : "Официант, курьер и т.д. — с контактом администратора для подтверждения"}
                    </p>
                  </div>
                </section>

                <section className="space-y-4" aria-labelledby="zayavka-personal-heading">
                  <h2 id="zayavka-personal-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2 text-center">
                    Личные данные
                  </h2>
                  <div>
                    <label htmlFor="zayavka-fullName" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">ФИО</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                      <input
                        id="zayavka-fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                        className={inputBase}
                        autoComplete="name"
                      />
                    </div>
                    {fieldErrors.fullName && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.fullName}</p>}
                  </div>
                  {!isEstablishment && (
                    <div className="min-w-0">
                      <label htmlFor="zayavka-dateOfBirth" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Дата рождения</label>
                      <div className="relative min-w-0 overflow-hidden rounded-xl focus-within:ring-2 focus-within:ring-[var(--color-accent-gold)]/40 focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-bg)]">
                        <Calendar className="absolute left-3 top-1/2 h-5 w-5 shrink-0 -translate-y-1/2 text-[var(--color-muted)]" />
                        <input
                          id="zayavka-dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                          className={`${inputBase} min-w-0 max-w-full box-border`}
                        />
                      </div>
                      {fieldErrors.dateOfBirth && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.dateOfBirth}</p>}
                    </div>
                  )}
                  <div>
                    <label htmlFor="zayavka-phone" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Номер телефона</label>
                    <div className="zayavka-phone-field relative flex rounded-xl border-0 bg-[var(--color-light-gray)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-accent-gold)]/40 focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-bg)]">
                      <span className="flex items-center gap-1 pl-3 text-[var(--color-text)]" aria-hidden="true">
                        <Phone className="zayavka-phone-prefix h-5 w-5 text-[var(--color-muted)]" />
                        <span className="zayavka-phone-prefix font-medium text-[var(--color-text)]">+7</span>
                      </span>
                      <input
                        id="zayavka-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={formatPhoneNational(formData.phone)}
                        onChange={(e) => handlePhoneChange(e, "phone")}
                        placeholder="(999) 123-45-67"
                        className={`${phoneInputBase} ${fieldErrors.phone ? "placeholder:text-[var(--color-text-secondary)]" : ""}`}
                        aria-invalid={Boolean(fieldErrors.phone)}
                      />
                    </div>
                    {fieldErrors.phone && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label htmlFor="zayavka-email" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Почта</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
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
                    {fieldErrors.email && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.email}</p>}
                    <p className="zayavka-hint mt-1 text-center text-[var(--color-muted)]">На неё будет выслана ссылка для регистрации после одобрения заявки</p>
                  </div>
                </section>

                <button
                  type="button"
                  onClick={handleNext}
                  className="auth-btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 text-[14px] font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Далее <ArrowRight className="h-5 w-5" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                {isEstablishment ? (
                  <section className="space-y-4" aria-labelledby="zayavka-company-heading">
                    <h2 id="zayavka-company-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2">
                      Данные о компании
                    </h2>
                    <div>
                      <label htmlFor="zayavka-companyName" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Название компании</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                        <input
                          id="zayavka-companyName"
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Кафе «Пушкин»"
                          className={inputBase}
                        />
                      </div>
                      {fieldErrors.companyName && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.companyName}</p>}
                    </div>
                    <div>
                      <label htmlFor="zayavka-companyRole" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Роль в компании (кто оставляет заявку)</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                        <input
                          id="zayavka-companyRole"
                          type="text"
                          value={formData.companyRole}
                          onChange={(e) => setFormData({ ...formData, companyRole: e.target.value })}
                          placeholder="Директор, менеджер"
                          className={inputBase}
                        />
                      </div>
                      {fieldErrors.companyRole && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.companyRole}</p>}
                    </div>
                    <div>
                      <label htmlFor="zayavka-employeeCount" className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">Количество сотрудников</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                        <input
                          id="zayavka-employeeCount"
                          type="number"
                          min={1}
                          max={10000}
                          value={formData.employeeCount}
                          onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                          placeholder="10"
                          className={inputBase}
                        />
                      </div>
                      {fieldErrors.employeeCount && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.employeeCount}</p>}
                    </div>
                  </section>
                ) : (
                  <>
                    <section className="space-y-4" aria-labelledby="zayavka-activity-heading">
                      <h2 id="zayavka-activity-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2 text-center">
                        Информация о заведении и деятельности
                      </h2>
                      <div>
                        <label htmlFor="zayavka-activityType" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Вид деятельности</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                          <input
                            id="zayavka-activityType"
                            type="text"
                            value={formData.activityType}
                            onChange={(e) => setFormData({ ...formData, activityType: e.target.value })}
                            placeholder="Официант, курьер, мастер"
                            className={inputBase}
                          />
                        </div>
                        {fieldErrors.activityType && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.activityType}</p>}
                      </div>
                      <div>
                        <label htmlFor="zayavka-establishment" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Заведение (если есть)</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                          <input
                            id="zayavka-establishment"
                            type="text"
                            value={formData.establishment}
                            onChange={(e) => setFormData({ ...formData, establishment: e.target.value })}
                            placeholder="Название кафе, ресторана"
                            className={inputBase}
                          />
                        </div>
                        {fieldErrors.establishment && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.establishment}</p>}
                      </div>
                    </section>
                    <section className="space-y-4" aria-labelledby="zayavka-admin-heading">
                      <h2 id="zayavka-admin-heading" className="text-sm font-semibold text-[var(--color-text)] border-0 pb-2 text-center">
                        Контакт администратора
                      </h2>
                      <p className="zayavka-hint mt-0.5 text-center text-[var(--color-muted)]">
                        Для подтверждения, что вы работаете в указанном заведении.
                      </p>
                      <div>
                        <label htmlFor="zayavka-adminFullName" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">ФИО администратора</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted)]" />
                          <input
                            id="zayavka-adminFullName"
                            type="text"
                            value={formData.adminFullName}
                            onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                            placeholder="Петров Пётр Петрович"
                            className={inputBase}
                          />
                        </div>
                        {fieldErrors.adminFullName && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.adminFullName}</p>}
                      </div>
                      <div>
                        <label htmlFor="zayavka-adminContactPhone" className="mb-1.5 block text-center text-sm font-medium text-[var(--color-text)]">Телефон администратора</label>
                        <div className="zayavka-phone-field relative flex rounded-xl border-0 bg-[var(--color-light-gray)] overflow-hidden focus-within:ring-2 focus-within:ring-[var(--color-accent-gold)]/40 focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-bg)]">
                          <span className="flex items-center gap-1 pl-3 text-[var(--color-text)]" aria-hidden="true">
                            <Phone className="zayavka-phone-prefix h-5 w-5 text-[var(--color-muted)]" />
                            <span className="zayavka-phone-prefix font-medium text-[var(--color-text)]">+7</span>
                          </span>
                          <input
                            id="zayavka-adminContactPhone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            value={formatPhoneNational(formData.adminContactPhone)}
                            onChange={(e) => handlePhoneChange(e, "adminContactPhone")}
                            placeholder="(999) 123-45-67"
                            className={`${phoneInputBase} ${fieldErrors.adminContactPhone ? "placeholder:text-[var(--color-text-secondary)]" : ""}`}
                            aria-invalid={Boolean(fieldErrors.adminContactPhone)}
                          />
                        </div>
                        {fieldErrors.adminContactPhone && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{fieldErrors.adminContactPhone}</p>}
                      </div>
                    </section>
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-muted)]/40 bg-white/10 px-4 py-3 text-[14px] font-semibold text-[var(--color-text)] hover:bg-white/20 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" /> Назад
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-btn-primary flex flex-1 items-center justify-center rounded-xl bg-[var(--color-brand-gold)] px-4 py-3 text-[14px] font-semibold text-[#0a192f] shadow-[var(--shadow-card)] hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? "Отправка..." : "Оставить заявку"}
                  </button>
                </div>
                <p className="zayavka-hint mt-3 text-center text-[var(--color-muted)]">
                  Нажимая «Оставить заявку», вы соглашаетесь с{" "}
                  <Link href="/politika" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
                    условиями обработки персональных данных
                  </Link>
                  ,{" "}
                  <Link href="/oferta" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
                    пользовательским соглашением
                  </Link>
                  {" "}и{" "}
                  <Link href="/politika-bezopasnosti" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">
                    политикой безопасности платежей
                  </Link>
                  .
                </p>
              </>
            )}
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
