"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";

type ProfileTotp = {
  adminTotpEnabled?: boolean;
  adminTotpEnrollmentPending?: boolean;
};

export default function AdminSecurityPage() {
  const [profile, setProfile] = useState<ProfileTotp | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const res = await fetchWithAuth("/api/profile");
    if (!res.ok) {
      setLoadError("Не удалось загрузить профиль");
      return;
    }
    const data = (await res.json()) as ProfileTotp;
    setProfile(data);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const startSetup = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth("/api/admin/totp/start", { method: "POST" });
      const data = (await res.json()) as { error?: string; qrDataUrl?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      if (data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
        setVerifyCode("");
      }
      await refreshProfile();
      setMessage("Отсканируйте QR в Google Authenticator и введите код ниже.");
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const verifySetup = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth("/api/admin/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.replace(/\s/g, "") }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      setQrDataUrl(null);
      setVerifyCode("");
      setMessage("Двухфакторная аутентификация включена. При следующем входе потребуется код из приложения.");
      await refreshProfile();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth("/api/admin/totp/cancel", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      setQrDataUrl(null);
      setVerifyCode("");
      setMessage("Настройка отменена.");
      await refreshProfile();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth("/api/admin/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.replace(/\s/g, ""),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Ошибка");
        return;
      }
      setDisablePassword("");
      setDisableCode("");
      setMessage("Двухфакторная аутентификация отключена.");
      await refreshProfile();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="px-4 text-[var(--color-text-secondary)]">
        <p>{loadError}</p>
      </div>
    );
  }

  const enabled = profile?.adminTotpEnabled === true;
  const pending = profile?.adminTotpEnrollmentPending === true;
  const showQr = qrDataUrl != null;

  return (
    <div className="mx-auto max-w-lg px-4 text-[var(--color-text)]">
      <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">
        Безопасность входа
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Google Authenticator и совместимые приложения (TOTP). Код запрашивается после логина и пароля.
      </p>

      {message && (
        <div className="mt-4 rounded-lg border border-[var(--color-accent-emerald)]/40 bg-[var(--color-accent-emerald)]/10 p-3 text-sm text-[var(--color-accent-emerald)]" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 p-3 text-sm text-[var(--color-accent-red)]" role="alert">
          {error}
        </div>
      )}

      <div className="mt-6 rounded-[10px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
        {enabled ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              2FA <span className="font-medium text-[var(--color-accent-emerald)]">включена</span>.
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Чтобы отключить, введите пароль аккаунта и текущий 6-значный код из приложения.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Пароль</label>
              <input
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[var(--color-navy)]/50 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Код из приложения</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-white/15 bg-[var(--color-navy)]/50 px-3 py-2 text-sm tracking-widest text-white placeholder:text-white/40"
                placeholder="000000"
              />
            </div>
            <button
              type="button"
              disabled={busy || disablePassword.length < 1 || disableCode.length !== 6}
              onClick={() => void disableTotp()}
              className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} w-full justify-center py-2.5`}
            >
              Отключить 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pending && !showQr && (
              <p className="text-sm text-amber-200/90">
                Настройка начата, но не завершена. Нажмите «Продолжить» для нового QR или отмените.
              </p>
            )}
            {showQr && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL от qrcode */}
                  <img src={qrDataUrl} alt="QR для Google Authenticator" width={220} height={220} className="h-auto w-[220px]" />
                </div>
                <p className="text-center text-xs text-[var(--color-text-secondary)]">
                  В приложении выберите «Добавить аккаунт» и отсканируйте код.
                </p>
                <div className="w-full">
                  <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">Код для проверки</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full rounded-lg border border-white/15 bg-[var(--color-navy)]/50 px-3 py-2 text-sm tracking-widest text-white placeholder:text-white/40"
                    placeholder="000000"
                  />
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy || verifyCode.length !== 6}
                    onClick={() => void verifySetup()}
                    className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} flex-1 justify-center py-2.5`}
                  >
                    Подтвердить и включить
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelSetup()}
                    className={`${ADMIN_BTN} flex-1 justify-center border border-white/20 py-2.5`}
                  >
                    Отменить
                  </button>
                </div>
              </div>
            )}
            {!showQr && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void startSetup()}
                className={`${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} w-full justify-center py-2.5`}
              >
                {pending ? "Новый QR (начать заново)" : "Начать настройку 2FA"}
              </button>
            )}
            {pending && !showQr && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancelSetup()}
                className={`${ADMIN_BTN} w-full justify-center border border-white/20 py-2.5 text-sm`}
              >
                Отменить незавершённую настройку
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
