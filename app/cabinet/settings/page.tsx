"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Loader2, CheckCircle2 } from "lucide-react";
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
  stats: import("../shared").Stats;
};

export default function CabinetSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editLogin, setEditLogin] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
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
          setError("Не удалось загрузить профиль");
          return;
        }
        const data = (await res.json()) as Profile;
        setUser(data);
        setEditLogin(data.login);
        setEditEmail(data.email ?? "");
        setEditFullName(data.fullName ?? "");
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

    const payload: Record<string, unknown> = {};
    if (editLogin.trim() !== user.login) payload.login = editLogin.trim();
    if (editEmail.trim() !== (user.email ?? "")) payload.email = editEmail.trim() || "";
    if (editFullName.trim() !== (user.fullName ?? "")) payload.fullName = editFullName.trim() || "";
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

      const j = (await res.json()) as { error?: string; issues?: unknown } | Profile;

      if (!res.ok) {
        setSaveError((j as { error?: string }).error ?? "Ошибка сохранения");
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

  const hasProfileChanges =
    editLogin.trim() !== (user?.login ?? "") ||
    editEmail.trim() !== (user?.email ?? "") ||
    editFullName.trim() !== (user?.fullName ?? "") ||
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
          className="mt-4 rounded-xl bg-[var(--color-brand-gold)] px-5 py-2.5 font-semibold text-[#0a192f] hover:opacity-90"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="flex items-center justify-between border-0 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]">
              <User className="h-6 w-6" />
            </div>
            <h2 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-navy)]">Данные для входа</h2>
          </div>
          {user && (
            <span className="rounded-lg bg-[var(--color-dark-gray)]/10 px-3 py-1.5 font-mono text-sm text-[var(--color-text-secondary)]">
              ID: #{user.uniqueId}
            </span>
          )}
        </div>
        <div className="p-6">

        {saveError && <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{saveError}</p>}
        {saveOk && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text)]">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Сохранено</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-login" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Логин</label>
            <input
              id="settings-login"
              type="text"
              value={editLogin}
              onChange={(e) => setEditLogin(e.target.value)}
              className={cabinetInputClassName(!!profileFieldErrors.login)}
            />
            {profileFieldErrors.login && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{profileFieldErrors.login}</p>}
          </div>
          <div>
            <label htmlFor="settings-email" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Email (необязательно)</label>
            <input
              id="settings-email"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="email@example.com"
              className={cabinetInputClassName(!!profileFieldErrors.email)}
            />
            {profileFieldErrors.email && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{profileFieldErrors.email}</p>}
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--color-navy)]">Анкета</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="settings-fullName" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">ФИО</label>
              <input
                id="settings-fullName"
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className={cabinetInputClassName(!!profileFieldErrors.fullName)}
              />
              {profileFieldErrors.fullName && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{profileFieldErrors.fullName}</p>}
            </div>
            <div>
              <label htmlFor="settings-birthDate" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Дата рождения</label>
              <input
                id="settings-birthDate"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                className={cabinetInputClassName(!!profileFieldErrors.birthDate)}
              />
              {profileFieldErrors.birthDate && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{profileFieldErrors.birthDate}</p>}
            </div>
            <div>
              <label htmlFor="settings-establishment" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Заведение</label>
              <input
                id="settings-establishment"
                type="text"
                value={editEstablishment}
                onChange={(e) => setEditEstablishment(e.target.value)}
                placeholder="Название заведения"
                className={cabinetInputClassName(!!profileFieldErrors.establishment)}
              />
              {profileFieldErrors.establishment && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{profileFieldErrors.establishment}</p>}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving || !hasProfileChanges}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 text-sm font-semibold text-[#0a192f] hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сохранить
        </button>
        </div>
      </div>

      <div className="cabinet-card rounded-[10px] border-0 bg-[var(--color-bg-sides)] shadow-[var(--shadow-subtle)] overflow-hidden">
        <div className="border-0 px-6 py-4">
          <h2 className="font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-navy)]">Сменить пароль</h2>
        </div>
        <div className="p-6">

        {pwError && <p className="mb-4 text-sm text-[var(--color-text-secondary)]">{pwError}</p>}
        {pwOk && (
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text)]">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>Пароль изменён</span>
          </div>
        )}

        <div className="grid gap-4 sm:max-w-md">
          <div>
            <label htmlFor="settings-pwCurrent" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Текущий пароль</label>
            <input
              id="settings-pwCurrent"
              type="password"
              autoComplete="current-password"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.currentPassword)}
            />
            {pwFieldErrors.currentPassword && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{pwFieldErrors.currentPassword}</p>}
          </div>
          <div>
            <label htmlFor="settings-pwNew" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Новый пароль</label>
            <input
              id="settings-pwNew"
              type="password"
              autoComplete="new-password"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.newPassword)}
            />
            {pwFieldErrors.newPassword && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{pwFieldErrors.newPassword}</p>}
          </div>
          <div>
            <label htmlFor="settings-pwConfirm" className="mb-1 block text-sm font-medium text-[var(--color-navy)]">Повторите новый пароль</label>
            <input
              id="settings-pwConfirm"
              type="password"
              autoComplete="new-password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className={cabinetInputClassName(!!pwFieldErrors.newPasswordConfirm)}
            />
            {pwFieldErrors.newPasswordConfirm && <p className="mt-1 text-xs text-[var(--color-text-secondary)]" role="alert">{pwFieldErrors.newPasswordConfirm}</p>}
          </div>
        </div>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
          className="mt-6 inline-flex items-center gap-2 rounded-xl border-0 px-5 py-2.5 font-semibold text-[var(--color-navy)] transition-all hover:bg-[var(--color-dark-gray)]/10 disabled:opacity-50"
        >
          {pwSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Сменить пароль
        </button>
        </div>
      </div>
    </div>
  );
}
