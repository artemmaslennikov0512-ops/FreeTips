"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Loader2, CheckCircle2, Camera, ImageIcon } from "lucide-react";
import { getCsrfHeader } from "@/lib/security/csrf-client";
import { getAccessToken, authHeaders, clearAccessToken } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { patchProfileSchema, changePasswordSchema } from "@/lib/validations";
import { getFieldErrors } from "@/lib/form-errors";
import { cabinetInputClassName } from "../shared";

type Profile = {
  id: string;
  uniqueId: number;
  login: string;
  email?: string | null;
  fullName?: string | null;
  birthDate?: string | null;
  establishment?: string | null;
  role: string;
  employeePhotoUrl?: string | null;
  stats: import("../shared").Stats;
};

export default function CabinetSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editLogin, setEditLogin] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editPatronymic, setEditPatronymic] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEstablishment, setEditEstablishment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);

  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({});
  const [pwOk, setPwOk] = useState(false);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/profile", { headers: authHeaders() });
        if (res.status === 401) {
          clearAccessToken();
          router.replace("/login");
          return;
        }
        if (!res.ok) {
          let msg = "Не удалось загрузить профиль";
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody?.error) msg += `: ${errBody.error}`;
            else msg += ` (код ${res.status})`;
          } catch {
            msg += ` (код ${res.status})`;
          }
          setError(msg);
          return;
        }
        const data = (await res.json()) as Profile;
        setUser(data);
        setEditLogin(data.login);
        setEditEmail(data.email ?? "");
        const parts = (data.fullName ?? "").trim().split(/\s+/).filter(Boolean);
        setEditLastName(parts[0] ?? "");
        setEditFirstName(parts[1] ?? "");
        setEditPatronymic(parts[2] ?? "");
        setEditBirthDate(data.birthDate ?? "");
        setEditEstablishment(data.establishment ?? "");
      } catch {
        setError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!getAccessToken() || !user) return;

    setProfileFieldErrors({});
    setSaveError(null);
    setSaveOk(false);

    const combinedFullName = [editLastName.trim(), editFirstName.trim(), editPatronymic.trim()].filter(Boolean).join(" ");
    const payload: Record<string, unknown> = {};
    if (editLogin.trim() !== user.login) payload.login = editLogin.trim();
    if (editEmail.trim() !== (user.email ?? "")) payload.email = editEmail.trim() || "";
    if (combinedFullName !== (user.fullName ?? "").trim()) payload.fullName = combinedFullName || "";
    if (editBirthDate.trim() !== (user.birthDate ?? "")) payload.birthDate = editBirthDate.trim() || "";
    if (editEstablishment.trim() !== (user.establishment ?? "")) payload.establishment = editEstablishment.trim() || "";

    const parsed = patchProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setProfileFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...getCsrfHeader(),
        },
        body: JSON.stringify(parsed.data),
      });

      const j = (await res.json()) as { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> } | Profile;

      if (!res.ok) {
        const err = j as { error?: string; details?: Array<{ path?: (string | number)[]; message?: string }> };
        const msg = err?.error ?? err?.details?.[0]?.message ?? "Ошибка сохранения";
        setSaveError(msg);
        if (Array.isArray(err?.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const d of err.details) {
            const path = d.path as (string | number)[] | undefined;
            const key = path?.[0];
            if (typeof key === "string" && d.message) fieldErrors[key] = d.message;
          }
          if (Object.keys(fieldErrors).length > 0) setProfileFieldErrors((prev) => ({ ...prev, ...fieldErrors }));
        }
        return;
      }

      setUser((prev) => (prev ? { ...prev, ...(j as Partial<Profile>) } : prev));
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch {
      setSaveError("Ошибка соединения");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!getAccessToken()) return;

    setPwError(null);
    setPwFieldErrors({});

    const parsed = changePasswordSchema.safeParse({
      currentPassword: pwCurrent,
      newPassword: pwNew,
      newPasswordConfirm: pwConfirm,
    });
    if (!parsed.success) {
      setPwFieldErrors(getFieldErrors(parsed.error));
      return;
    }

    setPwSaving(true);
    setPwOk(false);
    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
          ...getCsrfHeader(),
        },
        body: JSON.stringify(parsed.data),
      });

      const j = (await res.json()) as { error?: string; issues?: unknown };

      if (!res.ok) {
        setPwError(j.error ?? "Ошибка смены пароля");
        return;
      }

      setPwOk(true);
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      setTimeout(() => setPwOk(false), 3000);
    } catch {
      setPwError("Ошибка соединения");
    } finally {
      setPwSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !getAccessToken()) return;
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "avatar");
      const res = await fetch("/api/profile/employee-photo", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPhotoError(data?.error ?? "Ошибка загрузки");
        return;
      }
      const profileRes = await fetch("/api/profile", { headers: authHeaders() });
      if (profileRes.ok) {
        const updated = (await profileRes.json()) as Profile;
        setUser(updated);
      }
    } catch {
      setPhotoError("Ошибка соединения");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const combinedFullNameForCompare = [editLastName.trim(), editFirstName.trim(), editPatronymic.trim()].filter(Boolean).join(" ");
  const hasProfileChanges =
    editLogin.trim() !== (user?.login ?? "") ||
    editEmail.trim() !== (user?.email ?? "") ||
    combinedFullNameForCompare !== (user?.fullName ?? "").trim() ||
    editBirthDate.trim() !== (user?.birthDate ?? "") ||
    editEstablishment.trim() !== (user?.establishment ?? "");

  if (loading) {
    return <LoadingSpinner message="Загрузка профиля…" />;
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center">
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-[var(--color-brand-gold)] px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    );
  }

  const isEmployee = user?.role?.toUpperCase() === "EMPLOYEE";
  const isRecipient = user?.role?.toUpperCase() === "RECIPIENT";
  const canUploadPhoto = isEmployee || isRecipient;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {canUploadPhoto && (
        <div id="settings-photo" className="cabinet-card cabinet-settings-photo-block rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden text-white">
          <div className="flex items-center gap-3 border-0 px-6 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
              <Camera className="h-6 w-6" />
            </div>
            <h2 className="font-[family:var(--font-playfair)] text-lg font-semibold text-white">Фото профиля</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-white/90 mb-2">
              Загрузите фото — на странице оплаты чаевых гости увидят его рядом с вашим именем вместо иконки человека. Также отображается в сайдбаре ЛК. Доступно и получателям без заведения, и сотрудникам заведения.
            </p>
            <p className="text-sm text-white/75 mb-4">
              Рекомендуется не менее 200×200 px. Форматы: JPEG, PNG, WebP, до 5 МБ.
            </p>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-4">
                {user.employeePhotoUrl ? (
                  <img
                    src={user.employeePhotoUrl}
                    alt=""
                    className="settings-photo-avatar h-24 w-24 shrink-0 rounded-full object-cover border-2 border-[var(--color-brand-gold)]/30"
                  />
                ) : (
                  <div className="settings-photo-avatar h-24 w-24 shrink-0 rounded-full bg-[var(--color-dark-gray)]/50 flex items-center justify-center border-2 border-dashed border-white/20">
                    <ImageIcon className="h-10 w-10 text-white/40" />
                  </div>
                )}
                <div className="flex flex-col items-start gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Выберите фото"
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
                  >
                    {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    {photoUploading ? "Загрузка…" : "Загрузить фото"}
                  </button>
                  {user.employeePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-white/20 transition-colors"
                    >
                      Сохранить и обновить
                    </button>
                  )}
                </div>
              </div>
              {photoError && (
                <p className="mt-3 text-sm text-[var(--color-accent-red)]" role="alert">{photoError}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div id="settings-profile" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="flex items-center justify-between border-0 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
              <User className="h-6 w-6" />
            </div>
            <h2 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">Данные для входа</h2>
          </div>
          {user && (
            <span className="rounded-lg bg-[var(--color-dark-gray)]/10 px-3 py-1.5 font-mono text-sm text-[var(--color-text)]/90">
              ID: #{user.uniqueId}
            </span>
          )}
        </div>
        <div className="p-6">
        <div className="max-w-xl">

        {saveError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3" role="alert">
            <p className="text-sm font-medium text-white">{saveError}</p>
            <p className="mt-1 text-xs text-white/80">Заполните все обязательные поля или исправьте формат (дата — ГГГГ-ММ-ДД).</p>
          </div>
        )}
        {saveOk && (
          <div className="mb-4 flex items-center gap-2 text-sm text-white">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <span>Сохранено</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-login" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Логин</label>
            <input
              id="settings-login"
              type="text"
              value={editLogin}
              onChange={(e) => setEditLogin(e.target.value)}
              className={cabinetInputClassName(!!profileFieldErrors.login)}
            />
            {profileFieldErrors.login && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{profileFieldErrors.login}</p>}
          </div>
          <div>
            <label htmlFor="settings-email" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Email (необязательно)</label>
            <input
              id="settings-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="email@example.com"
              className={cabinetInputClassName(!!profileFieldErrors.email)}
            />
            {profileFieldErrors.email && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{profileFieldErrors.email}</p>}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Анкета</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-lastName" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Фамилия</label>
              <input
                id="settings-lastName"
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Иванов"
                className={cabinetInputClassName(!!profileFieldErrors.fullName)}
              />
              {profileFieldErrors.fullName && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{profileFieldErrors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="settings-firstName" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Имя</label>
              <input
                id="settings-firstName"
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Иван"
                className={cabinetInputClassName(false)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-patronymic" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Отчество</label>
              <input
                id="settings-patronymic"
                type="text"
                value={editPatronymic}
                onChange={(e) => setEditPatronymic(e.target.value)}
                placeholder="Иванович"
                className={cabinetInputClassName(false)}
              />
            </div>
            <div>
              <label htmlFor="settings-birthDate" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Дата рождения</label>
              <input
                id="settings-birthDate"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className={cabinetInputClassName(!!profileFieldErrors.birthDate)}
              />
              {profileFieldErrors.birthDate && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{profileFieldErrors.birthDate}</p>}
            </div>
            <div>
              <label htmlFor="settings-establishment" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Заведение</label>
              <input
                id="settings-establishment"
                type="text"
                value={editEstablishment}
                onChange={(e) => setEditEstablishment(e.target.value)}
                placeholder="Название заведения"
                className={cabinetInputClassName(!!profileFieldErrors.establishment)}
              />
              {profileFieldErrors.establishment && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{profileFieldErrors.establishment}</p>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving || !hasProfileChanges}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-[14px] font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сохранить
        </button>
        </div>
        </div>
      </div>

      <div id="settings-password" className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-0 px-6 py-4">
          <h2 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)]">Сменить пароль</h2>
        </div>
        <div className="p-6">
        <div className="max-w-xl">

        {pwError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3" role="alert">
            <p className="text-sm font-medium text-white">{pwError}</p>
          </div>
        )}
        {pwOk && (
          <div className="mb-4 flex items-center gap-2 text-sm text-white">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <span>Пароль изменён</span>
          </div>
        )}

        <div className="grid gap-4">
          <div>
            <label htmlFor="settings-pwCurrent" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Текущий пароль</label>
            <input
              id="settings-pwCurrent"
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.currentPassword)}
            />
            {pwFieldErrors.currentPassword && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{pwFieldErrors.currentPassword}</p>}
          </div>
          <div>
            <label htmlFor="settings-pwNew" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Новый пароль</label>
            <input
              id="settings-pwNew"
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.newPassword)}
            />
            {pwFieldErrors.newPassword && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{pwFieldErrors.newPassword}</p>}
          </div>
          <div>
            <label htmlFor="settings-pwConfirm" className="mb-1 block text-sm font-medium text-[var(--color-text)]">Повторите новый пароль</label>
            <input
              id="settings-pwConfirm"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.newPasswordConfirm)}
            />
            {pwFieldErrors.newPasswordConfirm && <p className="mt-1 text-xs text-[var(--color-accent-red)]" role="alert">{pwFieldErrors.newPasswordConfirm}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[var(--color-brand-gold)]/20 bg-white px-5 py-2.5 text-[14px] font-semibold text-[#0a192f] transition-all hover:bg-[var(--color-light-gray)] disabled:opacity-50"
        >
          {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сменить пароль
        </button>
        </div>
        </div>
      </div>
    </div>
  );
}
