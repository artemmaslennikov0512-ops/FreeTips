"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import {
  ADMIN_PANEL_ALERT_OK,
  ADMIN_PANEL_ALERT_WARN,
  ADMIN_PANEL_CARD,
  ADMIN_PANEL_PAGE_WIDE,
  ADMIN_PANEL_TEXTAREA,
} from "@/lib/admin-surface-classes";

const BTN_PRIMARY = `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-5 py-2.5 text-sm disabled:opacity-50`;

export default function AdminPaymentAcceptPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalOff, setGlobalOff] = useState(false);
  const [whitelistText, setWhitelistText] = useState("");
  const [blacklistText, setBlacklistText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const res = await fetch("/api/admin/payment-accept", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setLoadError("Не удалось загрузить настройки");
          return;
        }
        const data = (await res.json()) as {
          globalPaymentsDisabled: boolean;
          whitelistText?: string;
          blacklistText?: string;
          updatedAt?: string;
        };
        setGlobalOff(data.globalPaymentsDisabled);
        setWhitelistText(data.whitelistText ?? "");
        setBlacklistText(data.blacklistText ?? "");
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      } catch {
        setLoadError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const save = async (patch: {
    globalPaymentsDisabled?: boolean;
    whitelistText?: string | null;
    blacklistText?: string | null;
  }) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/payment-accept", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        error?: string;
        globalPaymentsDisabled?: boolean;
        whitelistText?: string;
        blacklistText?: string;
        updatedAt?: string;
        whitelistUnknownTokens?: string[];
        blacklistUnknownTokens?: string[];
      };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Ошибка сохранения" });
        return;
      }
      if (data.globalPaymentsDisabled !== undefined) setGlobalOff(data.globalPaymentsDisabled);
      if (typeof data.whitelistText === "string") setWhitelistText(data.whitelistText);
      if (typeof data.blacklistText === "string") setBlacklistText(data.blacklistText);
      if (data.updatedAt) setUpdatedAt(data.updatedAt);

      const unknown: string[] = [];
      if (data.whitelistUnknownTokens?.length) unknown.push(`Белый список — не найдены: ${data.whitelistUnknownTokens.join(", ")}`);
      if (data.blacklistUnknownTokens?.length) unknown.push(`Чёрный список — не найдены: ${data.blacklistUnknownTokens.join(", ")}`);

      setMessage({
        type: unknown.length ? "err" : "ok",
        text:
          unknown.length > 0
            ? `Сохранено с предупреждением. ${unknown.join(" ")}`
            : "Настройки сохранены.",
      });
    } catch {
      setMessage({ type: "err", text: "Ошибка соединения" });
    } finally {
      setSaving(false);
    }
  };

  const saveListsAndToggle = () => {
    void save({
      globalPaymentsDisabled: globalOff,
      whitelistText,
      blacklistText,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-white/60">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-center text-white/80">{loadError}</div>
    );
  }

  return (
    <div className={ADMIN_PANEL_PAGE_WIDE}>
      <div className="flex flex-col items-center gap-3">
        <CreditCard className="h-9 w-9 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
        <div className="max-w-2xl">
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-white">
            Приём по платёжным ссылкам
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Один переключатель отключает новые переводы по всем ссылкам{" "}
            <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-white/90">/pay/…</code>, кроме белого списка. Сайт и
            личные кабинеты продолжают работать. Чёрный список блокирует приём, когда глобальный стоп выключен.
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-white/50">Последнее изменение: {new Date(updatedAt).toLocaleString("ru-RU")}</p>
          )}
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={message.type === "ok" ? ADMIN_PANEL_ALERT_OK : ADMIN_PANEL_ALERT_WARN}
        >
          {message.text}
        </div>
      )}

      <div className={ADMIN_PANEL_CARD}>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <div>
            <p className="font-medium text-white">Стоп приёма для всех</p>
            <p className="mt-1 text-sm text-white/75">
              Пока включено — платить могут только аккаунты из белого списка ниже.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={globalOff}
              disabled={saving}
              onClick={() => {
                const next = !globalOff;
                setGlobalOff(next);
                void save({ globalPaymentsDisabled: next });
              }}
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${globalOff ? "bg-[var(--color-accent-red)]" : "bg-white/25"} disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${globalOff ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>
            <span className="text-sm font-medium text-white">{globalOff ? "Включён" : "Выключен"}</span>
          </div>
        </div>
      </div>

      <div className={ADMIN_PANEL_CARD}>
        <label className="block text-sm font-medium text-white">Белый список (логин или id пользователя)</label>
        <p className="mt-1 text-xs text-white/70">
          Имеет смысл при включённом стопе: эти аккаунты продолжают принимать чаевые по ссылкам. По одному на строку или через запятую.
        </p>
        <textarea
          className={ADMIN_PANEL_TEXTAREA}
          value={whitelistText}
          onChange={(e) => setWhitelistText(e.target.value)}
          disabled={saving}
          placeholder="логин или id (по одному в строке или через запятую)"
          spellCheck={false}
        />
      </div>

      <div className={ADMIN_PANEL_CARD}>
        <label className="block text-sm font-medium text-white">Чёрный список (логин или id пользователя)</label>
        <p className="mt-1 text-xs text-white/70">
          Когда стоп выключен — эти аккаунты не принимают платежи по ссылке (остальные работают).
        </p>
        <textarea
          className={ADMIN_PANEL_TEXTAREA}
          value={blacklistText}
          onChange={(e) => setBlacklistText(e.target.value)}
          disabled={saving}
          placeholder="login_нарушителя"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={() => void saveListsAndToggle()}>
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Сохранение…
            </span>
          ) : (
            "Сохранить списки и положение стопа"
          )}
        </button>
      </div>
    </div>
  );
}
