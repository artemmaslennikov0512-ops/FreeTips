"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth-client";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { cabinetInputClassName } from "@/app/cabinet/shared";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

type TotpProfile = {
  totpEnabled?: boolean;
  totpEnrollmentPending?: boolean;
};

export type ProfileTotpVariant = "admin" | "cabinet" | "establishment";

const API = {
  start: "/api/profile/totp/start",
  verify: "/api/profile/totp/verify",
  cancel: "/api/profile/totp/cancel",
  disable: "/api/profile/totp/disable",
} as const;

export function ProfileTotpSection({
  variant,
  embedded = false,
}: {
  variant: ProfileTotpVariant;
  embedded?: boolean;
}) {
  const [profile, setProfile] = useState<TotpProfile | null>(null);
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
    const data = (await res.json()) as TotpProfile;
    setProfile(data);
    setLoadError(null);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const v = variantStyles(variant);

  const startSetup = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth(API.start, { method: "POST" });
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
      const res = await fetchWithAuth(API.verify, {
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
      const res = await fetchWithAuth(API.cancel, { method: "POST" });
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
      const res = await fetchWithAuth(API.disable, {
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
      <div className={v.loadErrorWrap}>
        <p>{loadError}</p>
      </div>
    );
  }

  const enabled = profile?.totpEnabled === true;
  const pending = profile?.totpEnrollmentPending === true;
  const showQr = qrDataUrl != null;

  const btnDisable = totpDisableButtonClass(variant);
  const btnPrimaryFlex = totpPrimaryFlexClass(variant);
  const btnSecondaryFlex = totpSecondaryFlexClass(variant);
  const btnPrimaryFull = totpPrimaryFullClass(variant);
  const btnGhostFull = totpGhostFullClass(variant);

  return (
    <div className={embedded ? undefined : v.outer}>
      {!embedded && (
        <>
          <h1 className={v.pageTitle}>Безопасность входа</h1>
          <p className={v.pageDesc}>
            Google Authenticator и совместимые приложения (TOTP). Код запрашивается после логина и пароля.
          </p>
        </>
      )}

      {message && (
        <div className={v.msgOk} role="status">
          {message}
        </div>
      )}
      {error && (
        <div className={v.msgErr} role="alert">
          {error}
        </div>
      )}

      <div className={embedded && variant === "cabinet" ? "rounded-none border-0 bg-transparent p-0 shadow-none" : v.card}>
        {embedded && (
          <h3 className={v.embedTitle}>Двухфакторная аутентификация (2FA)</h3>
        )}
        {enabled ? (
          <div className="space-y-4">
            <p className={v.textMuted}>
              2FA <span className={v.textOk}>включена</span>.
            </p>
            <p className={v.textMuted}>
              Чтобы отключить, введите пароль аккаунта и текущий 6-значный код из приложения.
            </p>
            <div>
              <label className={v.label}>Пароль</label>
              <input
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className={v.input}
              />
            </div>
            <div>
              <label className={v.label}>Код из приложения</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${v.input} tracking-widest`}
                placeholder="000000"
              />
            </div>
            <button
              type="button"
              disabled={busy || disablePassword.length < 1 || disableCode.length !== 6}
              onClick={() => void disableTotp()}
              className={btnDisable}
            >
              Отключить 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pending && !showQr && <p className={v.textPending}>Настройка начата, но не завершена. Нажмите «Новый QR» или отмените.</p>}
            {showQr && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                  <img src={qrDataUrl} alt="QR для Google Authenticator" width={220} height={220} className="h-auto w-[220px]" />
                </div>
                <p className={`${v.textMuted} text-center text-xs`}>В приложении выберите «Добавить аккаунт» и отсканируйте код.</p>
                <div className="w-full">
                  <label className={v.label}>Код для проверки</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${v.input} tracking-widest`}
                    placeholder="000000"
                  />
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy || verifyCode.length !== 6}
                    onClick={() => void verifySetup()}
                    className={btnPrimaryFlex}
                  >
                    Подтвердить и включить
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelSetup()}
                    className={btnSecondaryFlex}
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
                className={btnPrimaryFull}
              >
                {pending ? "Новый QR (начать заново)" : "Начать настройку 2FA"}
              </button>
            )}
            {pending && !showQr && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void cancelSetup()}
                className={btnGhostFull}
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

function totpDisableButtonClass(variant: ProfileTotpVariant): string {
  if (variant === "cabinet") return `${CABINET_WAITER_BTN_INLINE} w-full justify-center px-4 py-2.5`;
  if (variant === "establishment") {
    return "w-full rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50";
  }
  return `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} w-full justify-center py-2.5`;
}

function totpPrimaryFlexClass(variant: ProfileTotpVariant): string {
  if (variant === "cabinet") return `${CABINET_WAITER_BTN_INLINE} flex-1 justify-center px-4 py-2.5`;
  if (variant === "establishment") {
    return "flex-1 rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50";
  }
  return `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} flex-1 justify-center py-2.5`;
}

function totpSecondaryFlexClass(variant: ProfileTotpVariant): string {
  if (variant === "cabinet") {
    return `${CABINET_WAITER_BTN_INLINE} flex-1 justify-center border border-[var(--color-dark-gray)]/30 bg-transparent px-4 py-2.5`;
  }
  if (variant === "establishment") {
    return "flex-1 rounded-xl border border-white/25 px-4 py-2.5 font-medium text-white hover:bg-white/10";
  }
  return `${ADMIN_BTN} flex-1 justify-center border border-white/20 py-2.5`;
}

function totpPrimaryFullClass(variant: ProfileTotpVariant): string {
  if (variant === "cabinet") return `${CABINET_WAITER_BTN_INLINE} w-full justify-center px-4 py-2.5`;
  if (variant === "establishment") {
    return "w-full rounded-xl bg-[var(--color-brand-gold)] px-4 py-2.5 font-medium text-[#0a192f] hover:opacity-90 disabled:opacity-50";
  }
  return `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} w-full justify-center py-2.5`;
}

function totpGhostFullClass(variant: ProfileTotpVariant): string {
  if (variant === "cabinet") {
    return `${CABINET_WAITER_BTN_INLINE} w-full justify-center border border-[var(--color-dark-gray)]/30 bg-transparent px-4 py-2.5 text-sm`;
  }
  if (variant === "establishment") {
    return "w-full rounded-xl border border-white/25 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10";
  }
  return `${ADMIN_BTN} w-full justify-center border border-white/20 py-2.5 text-sm`;
}

function variantStyles(variant: ProfileTotpVariant) {
  if (variant === "cabinet") {
    return {
      outer: "",
      pageTitle: "",
      pageDesc: "",
      embedTitle: "font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)] mb-4",
      card: "rounded-[10px] border-0 bg-[var(--color-bg-sides)] p-6 shadow-[var(--shadow-subtle)]",
      msgOk: "mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-100",
      msgErr: "mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-100",
      loadErrorWrap: "text-sm text-[var(--color-accent-red)]",
      textMuted: "text-sm text-[var(--color-text-secondary)]",
      textOk: "font-medium text-green-400",
      textPending: "text-sm text-amber-200",
      label: "mb-1 block text-xs font-medium text-[var(--color-text)]",
      input: cabinetInputClassName(false),
    };
  }
  if (variant === "establishment") {
    return {
      outer: "mx-auto max-w-lg text-white",
      pageTitle: "font-[family:var(--font-playfair)] text-2xl font-semibold text-white",
      pageDesc: "mt-2 text-sm text-white/75",
      embedTitle: "font-[family:var(--font-playfair)] text-lg font-semibold text-white mb-4",
      card: "mt-6 rounded-[10px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl",
      msgOk: "mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-200",
      msgErr: "mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200",
      loadErrorWrap: "text-sm text-red-300",
      textMuted: "text-sm text-white/80",
      textOk: "font-medium text-emerald-300",
      textPending: "text-sm text-amber-200",
      label: "mb-1 block text-xs font-medium text-white/70",
      input:
        "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-gold)]/40",
    };
  }
  return {
    outer: "mx-auto max-w-lg px-4 text-[var(--color-text)]",
    pageTitle: "font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]",
    pageDesc: "mt-2 text-sm text-[var(--color-text-secondary)]",
    embedTitle: "font-[family:var(--font-playfair)] text-lg font-semibold text-[var(--color-text)] mb-4",
    card: "mt-6 rounded-[10px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl",
    msgOk: "mt-4 rounded-lg border border-[var(--color-accent-emerald)]/40 bg-[var(--color-accent-emerald)]/10 p-3 text-sm text-[var(--color-accent-emerald)]",
    msgErr: "mt-4 rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 p-3 text-sm text-[var(--color-accent-red)]",
    loadErrorWrap: "px-4 text-[var(--color-text-secondary)]",
    textMuted: "text-sm text-[var(--color-text-secondary)]",
    textOk: "font-medium text-[var(--color-accent-emerald)]",
    textPending: "text-sm text-amber-200/90",
    label: "mb-1 block text-xs font-medium text-[var(--color-text-secondary)]",
    input: "w-full rounded-lg border border-white/15 bg-[var(--color-navy)]/50 px-3 py-2 text-sm text-white placeholder:text-white/40",
  };
}
