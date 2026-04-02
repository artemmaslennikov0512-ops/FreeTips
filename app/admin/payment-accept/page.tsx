"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";

const CARD =
  "rounded-2xl border border-white/15 bg-white/[0.06] p-6 text-[var(--color-text)] shadow-[var(--shadow-card)]";
const BTN_PRIMARY = `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-5 py-2.5 text-sm disabled:opacity-50`;
const TEXTAREA =
  "mt-2 w-full min-h-[120px] rounded-lg border border-[rgba(197,165,114,0.25)] bg-[var(--color-bg-sides)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-brand-gold)] font-mono";

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
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--color-text-secondary)]">{loadError}</div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-1 h-8 w-8 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
        <div>
          <h1 className="font-[family:var(--font-playfair)] text-2xl font-semibold text-[var(--color-text)]">
            Приём по платёжным ссылкам
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Один переключатель отключает новые переводы по всем ссылкам <code className="text-xs">/pay/…</code>, кроме белого списка.
            Сайт и личные кабинеты продолжают работать. Чёрный список блокирует приём, когда глобальный стоп выключен.
          </p>
          {updatedAt && (
            <p className="mt-1 text-xs text-[var(--color-muted)]">Последнее изменение: {new Date(updatedAt).toLocaleString("ru-RU")}</p>
          )}
        </div>
      </div>

      {message && (
        <div
          role="status"
          className={
            message.type === "ok"
              ? "rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
              : "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          }
        >
          {message.text}
        </div>
      )}

      <div className={CARD}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[var(--color-text)]">Стоп приёма для всех</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Пока включено — платить могут только аккаунты из белого списка ниже.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${globalOff ? "bg-[var(--color-accent-red)]" : "bg-white/20"} disabled:opacity-50`}
            >
              <span
                className={`absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow transition-transform ${globalOff ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>
            <span className="text-sm font-medium">{globalOff ? "Включён" : "Выключен"}</span>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <label className="block text-sm font-medium text-[var(--color-text)]">Белый список (логин или id пользователя)</label>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Имеет смысл при включённом стопе: эти аккаунты продолжают принимать чаевые по ссылкам. По одному на строку или через запятую.
        </p>
        <textarea
          className={TEXTAREA}
          value={whitelistText}
          onChange={(e) => setWhitelistText(e.target.value)}
          disabled={saving}
          placeholder="логин или id (по одному в строке или через запятую)"
          spellCheck={false}
        />
      </div>

      <div className={CARD}>
        <label className="block text-sm font-medium text-[var(--color-text)]">Чёрный список (логин или id пользователя)</label>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Когда стоп выключен — эти аккаунты не принимают платежи по ссылке (остальные работают).
        </p>
        <textarea
          className={TEXTAREA}
          value={blacklistText}
          onChange={(e) => setBlacklistText(e.target.value)}
          disabled={saving}
          placeholder="login_нарушителя"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap gap-3">
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
