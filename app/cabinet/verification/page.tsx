"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, FileImage, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cabinetInputClassName } from "../shared";
import { getFieldErrors } from "@/lib/form-errors";
import { verificationStep1Schema, verificationSubmitSchema } from "@/lib/validations";
import { getCsrfHeader } from "@/lib/security/csrf-client";

type VerificationData = {
  verificationStatus: string;
  verificationRejectionReason: string | null;
  currentRequest: {
    id: string;
    fullName: string;
    birthDate: string;
    passportSeries: string;
    passportNumber: string;
    inn: string;
    hasPassportMain: boolean;
    hasPassportSpread: boolean;
    hasSelfie: boolean;
  } | null;
};

const DOC_LABELS: Record<string, string> = {
  passport_main: "Главное фото паспорта",
  passport_spread: "Разворот паспорта",
  selfie: "Селфи с паспортом",
};

export default function CabinetVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [inn, setInn] = useState("");
  const [consent, setConsent] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState(false);

  const fetchVerification = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      const res = await fetch("/api/verification", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        localStorage.removeItem("accessToken");
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError("Не удалось загрузить данные");
        return;
      }
      const json = (await res.json()) as VerificationData;
      setData(json);
      if (json.currentRequest) {
        setRequestId(json.currentRequest.id);
        setFullName(json.currentRequest.fullName);
        setBirthDate(json.currentRequest.birthDate);
        setPassportSeries(json.currentRequest.passportSeries);
        setPassportNumber(json.currentRequest.passportNumber);
        setInn(json.currentRequest.inn);
        setStep(2);
      }
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const handleStep1 = async () => {
    setFieldErrors({});
    setSubmitError(null);
    const parsed = verificationStep1Schema.safeParse({
      fullName: fullName.trim(),
      birthDate: birthDate.trim(),
      passportSeries: passportSeries.trim(),
      passportNumber: passportNumber.trim(),
      inn: inn.trim(),
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError((body as { error?: string }).error ?? "Ошибка сохранения");
        setSaving(false);
        return;
      }
      setRequestId((body as { requestId: string }).requestId);
      setStep(2);
    } catch {
      setSubmitError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (type: string, file: File) => {
    if (!requestId || !file) return;
    setUploadError(null);
    setUploading((prev) => ({ ...prev, [type]: true }));
    try {
      const token = localStorage.getItem("accessToken");
      const form = new FormData();
      form.set("requestId", requestId);
      form.set("type", type);
      form.set("file", file);
      const res = await fetch("/api/verification/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        await fetchVerification();
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setUploadError(body.error ?? `Ошибка загрузки (${res.status})`);
      }
    } catch {
      setUploadError("Ошибка соединения");
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async () => {
    setFieldErrors({});
    setSubmitError(null);
    const parsed = verificationSubmitSchema.safeParse({
      fullName: fullName.trim(),
      birthDate: birthDate.trim(),
      passportSeries: passportSeries.trim(),
      passportNumber: passportNumber.trim(),
      inn: inn.trim(),
      consentPersonalData: consent,
    });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch("/api/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...getCsrfHeader(),
        },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError((body as { error?: string }).error ?? "Ошибка отправки");
        setSaving(false);
        return;
      }
      setSubmitOk(true);
      await fetchVerification();
    } catch {
      setSubmitError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-brand-gold)] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">{error}</p>
      </div>
    );
  }

  if (data?.verificationStatus === "VERIFIED") {
    return (
      <div className="space-y-6">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
          Верификация
        </h1>
        <div className="cabinet-block-inner flex items-center gap-4 rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/10 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-600/20 text-green-500">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)]">Аккаунт верифицирован</p>
            <p className="text-sm text-[var(--color-text)]/80">Ваша личность подтверждена. Вы можете пользоваться всеми услугами сервиса.</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingWithAllDocs =
    data?.verificationStatus === "PENDING" &&
    data.currentRequest &&
    data.currentRequest.hasPassportMain &&
    data.currentRequest.hasPassportSpread &&
    data.currentRequest.hasSelfie;

  if (pendingWithAllDocs) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)]">
          Верификация
        </h1>
        <div className="cabinet-block-inner flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
          <Clock className="h-10 w-10 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-[var(--color-text)]">Заявка на рассмотрении</p>
            <p className="text-sm text-[var(--color-text)]/80">Мы проверяем ваши документы. Ожидайте уведомления.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="font-[family:var(--font-playfair)] text-xl font-semibold text-[var(--color-text)] text-center">
        Верификация
      </h1>

      {data?.verificationStatus === "REJECTED" && data.verificationRejectionReason && (
        <div className="cabinet-block-inner flex items-start gap-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 min-h-0 w-full">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-500 mt-0.5" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-[var(--color-text)]">Заявка отклонена</p>
            <p className="text-sm text-[var(--color-text)]/90 break-words whitespace-pre-wrap">{data.verificationRejectionReason}</p>
            <p className="pt-1 text-sm text-[var(--color-text)]/70">Вы можете подать заявку повторно, заполнив форму ниже.</p>
          </div>
        </div>
      )}

      <div className="cabinet-card mx-auto max-w-xl rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-0 px-6 py-4">
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-full bg-[var(--color-brand-gold)]/20 px-2.5 py-0.5 text-sm font-medium text-[var(--color-brand-gold)]">
              Этап {step} из 2
            </span>
          </div>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-white/70">Все поля обязательны для заполнения.</p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">ФИО <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={cabinetInputClassName(!!fieldErrors.fullName)}
                  placeholder="Иванов Иван Иванович"
                  required
                />
                {fieldErrors.fullName && <p className="mt-1 text-sm text-red-500">{fieldErrors.fullName}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Дата рождения <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={cabinetInputClassName(!!fieldErrors.birthDate)}
                  required
                />
                {fieldErrors.birthDate && <p className="mt-1 text-sm text-red-500">{fieldErrors.birthDate}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Серия паспорта <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={passportSeries}
                    onChange={(e) => setPassportSeries(e.target.value.replace(/\D/g, ""))}
                    className={cabinetInputClassName(!!fieldErrors.passportSeries)}
                    placeholder="1234"
                    required
                  />
                  {fieldErrors.passportSeries && <p className="mt-1 text-sm text-red-500">{fieldErrors.passportSeries}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Номер паспорта <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ""))}
                    className={cabinetInputClassName(!!fieldErrors.passportNumber)}
                    placeholder="567890"
                    required
                  />
                  {fieldErrors.passportNumber && <p className="mt-1 text-sm text-red-500">{fieldErrors.passportNumber}</p>}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">ИНН <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={inn}
                  onChange={(e) => setInn(e.target.value.replace(/\D/g, ""))}
                  className={cabinetInputClassName(!!fieldErrors.inn)}
                  placeholder="10 или 12 цифр"
                  required
                />
                {fieldErrors.inn && <p className="mt-1 text-sm text-red-500">{fieldErrors.inn}</p>}
              </div>
              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              <button
                type="button"
                onClick={handleStep1}
                disabled={saving}
                className="rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Далее"}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-white/90">
                Загрузите фото документов (JPEG, PNG или WebP, до 10 МБ каждое).
              </p>
              {uploadError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {uploadError}
                </div>
              )}
              {(["passport_main", "passport_spread", "selfie"] as const).map((type) => (
                <div key={type} className="rounded-xl border border-[var(--color-brand-gold)]/20 bg-[var(--color-dark-gray)]/5 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-[var(--color-brand-gold)]" />
                    <span className="font-medium text-white">{DOC_LABELS[type]}</span>
                    {data?.currentRequest &&
                      (type === "passport_main"
                        ? data.currentRequest.hasPassportMain
                        : type === "passport_spread"
                          ? data.currentRequest.hasPassportSpread
                          : data.currentRequest.hasSelfie) && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="block w-full text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-brand-gold)] file:px-4 file:py-2 file:text-[#0a192f] file:font-semibold"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(type, f);
                      e.target.value = "";
                    }}
                    disabled={uploading[type]}
                  />
                  {uploading[type] && <p className="mt-1 text-xs text-white/80">Загрузка…</p>}
                </div>
              ))}

              <div className="border-t border-[var(--color-dark-gray)]/20 pt-6">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--color-dark-gray)]/40 text-[var(--color-brand-gold)] focus:ring-[var(--color-brand-gold)]"
                  />
                  <span className="text-sm text-white">
                    <span className="text-red-400">*</span> Я соглашаюсь на сбор и обработку персональных данных в соответствии с{" "}
                    <Link href="/politika" className="text-[var(--color-brand-gold)] hover:underline">
                      Политикой обработки персональных данных
                    </Link>{" "}
                    и{" "}
                    <Link href="/oferta" className="text-[var(--color-brand-gold)] hover:underline">
                      Пользовательским соглашением
                    </Link>
                    .
                  </span>
                </label>
                {fieldErrors.consentPersonalData && (
                  <p className="mt-1 text-sm text-red-500">{fieldErrors.consentPersonalData}</p>
                )}
              </div>

              {submitError && <p className="text-sm text-red-500">{submitError}</p>}
              {submitOk && (
                <p className="text-sm font-medium text-green-600">Заявка отправлена на рассмотрение.</p>
              )}
              <p className="text-xs text-white/70">
                Для отправки заявки необходимо загрузить все три документа и принять соглашение выше.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-[10px] border border-[var(--color-brand-gold)]/40 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[var(--color-dark-gray)]/10"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    saving ||
                    !consent ||
                    !data?.currentRequest?.hasPassportMain ||
                    !data?.currentRequest?.hasPassportSpread ||
                    !data?.currentRequest?.hasSelfie
                  }
                  className="rounded-[10px] bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Отправка…" : "Отправить заявку"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
