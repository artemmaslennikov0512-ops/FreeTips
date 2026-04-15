"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, X } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import {
  ADMIN_PANEL_ALERT_OK,
  ADMIN_PANEL_ALERT_WARN,
  ADMIN_PANEL_CARD,
  ADMIN_PANEL_INPUT_FULL_WIDTH,
  ADMIN_PANEL_PAGE_WIDE,
  ADMIN_PANEL_STATE_CENTER_COMPACT,
} from "@/lib/admin-surface-classes";
import { PANEL_PAGE_TITLE_ADMIN_XL_CENTERED } from "@/lib/panel-shell-visual-classes";
import { fetchWithAuth } from "@/lib/auth-client";

const BTN_PRIMARY = `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-5 py-2.5 text-sm disabled:opacity-50`;
const BTN_NEUTRAL = `${ADMIN_BTN} admin-btn--neutral px-4 py-2 text-sm disabled:opacity-50`;

type PaymentListEntry = { userId: string | null; display: string };

function entryKey(e: PaymentListEntry): string {
  return e.userId ?? `pending:${e.display}`;
}

/** Как на сервере в parsePaymentAccountTokens */
function parseTokens(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

function zipEntries(ids: string[], text: string): PaymentListEntry[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (ids.length === 0) return [];
  return ids.map((id, i) => ({ userId: id, display: lines[i] ?? id }));
}

export default function AdminPaymentAcceptPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [globalOff, setGlobalOff] = useState(false);
  const [whitelistEntries, setWhitelistEntries] = useState<PaymentListEntry[]>([]);
  const [blacklistEntries, setBlacklistEntries] = useState<PaymentListEntry[]>([]);
  const [whitelistDraft, setWhitelistDraft] = useState("");
  const [blacklistDraft, setBlacklistDraft] = useState("");
  const [listTab, setListTab] = useState<"white" | "black">("white");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const applyServerLists = useCallback(
    (data: {
      paymentWhitelistUserIds?: string[];
      paymentBlacklistUserIds?: string[];
      whitelistText?: string;
      blacklistText?: string;
    }) => {
      setWhitelistEntries(
        zipEntries(data.paymentWhitelistUserIds ?? [], data.whitelistText ?? ""),
      );
      setBlacklistEntries(
        zipEntries(data.paymentBlacklistUserIds ?? [], data.blacklistText ?? ""),
      );
    },
    [],
  );

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/payment-accept");
        if (!res.ok) {
          setLoadError("Не удалось загрузить настройки");
          return;
        }
        const data = (await res.json()) as {
          globalPaymentsDisabled: boolean;
          paymentWhitelistUserIds?: string[];
          paymentBlacklistUserIds?: string[];
          whitelistText?: string;
          blacklistText?: string;
        };
        setGlobalOff(data.globalPaymentsDisabled);
        applyServerLists(data);
      } catch {
        setLoadError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [applyServerLists]);

  const save = async (patch: {
    globalPaymentsDisabled?: boolean;
    whitelistText?: string | null;
    blacklistText?: string | null;
  }) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth("/api/admin/payment-accept", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as {
        error?: string;
        globalPaymentsDisabled?: boolean;
        paymentWhitelistUserIds?: string[];
        paymentBlacklistUserIds?: string[];
        whitelistText?: string;
        blacklistText?: string;
        whitelistUnknownTokens?: string[];
        blacklistUnknownTokens?: string[];
      };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Ошибка сохранения" });
        return;
      }
      if (data.globalPaymentsDisabled !== undefined) setGlobalOff(data.globalPaymentsDisabled);
      applyServerLists(data);

      const unknown: string[] = [];
      if (data.whitelistUnknownTokens?.length)
        unknown.push(`Белый список — не найдены: ${data.whitelistUnknownTokens.join(", ")}`);
      if (data.blacklistUnknownTokens?.length)
        unknown.push(`Чёрный список — не найдены: ${data.blacklistUnknownTokens.join(", ")}`);

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

  const listsToText = (entries: PaymentListEntry[]) =>
    entries.map((e) => e.display).join("\n");

  const saveListsAndToggle = () => {
    void save({
      globalPaymentsDisabled: globalOff,
      whitelistText: listsToText(whitelistEntries),
      blacklistText: listsToText(blacklistEntries),
    });
  };

  const addToWhitelist = () => {
    const tokens = parseTokens(whitelistDraft);
    if (tokens.length === 0) return;
    setWhitelistEntries((prev) => {
      const seen = new Set(prev.map((e) => e.display.toLowerCase()));
      const next = [...prev];
      for (const t of tokens) {
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ userId: null, display: t });
      }
      return next;
    });
    setWhitelistDraft("");
  };

  const addToBlacklist = () => {
    const tokens = parseTokens(blacklistDraft);
    if (tokens.length === 0) return;
    setBlacklistEntries((prev) => {
      const seen = new Set(prev.map((e) => e.display.toLowerCase()));
      const next = [...prev];
      for (const t of tokens) {
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ userId: null, display: t });
      }
      return next;
    });
    setBlacklistDraft("");
  };

  const removeWhitelist = (key: string) => {
    setWhitelistEntries((prev) => prev.filter((e) => entryKey(e) !== key));
  };

  const removeBlacklist = (key: string) => {
    setBlacklistEntries((prev) => prev.filter((e) => entryKey(e) !== key));
  };

  const activeRows = listTab === "white" ? whitelistEntries : blacklistEntries;
  const removeActive = listTab === "white" ? removeWhitelist : removeBlacklist;

  const tabBtn = (active: boolean) =>
    `rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-white/15 text-white border border-b-0 border-white/20"
        : "text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
    }`;

  const tableWrapClass =
    "admin-dashboard-table cabinet-section-header mt-4 w-full overflow-x-auto rounded-xl border-0 text-left";

  const emptyHint = useMemo(
    () =>
      listTab === "white"
        ? "В белом списке пока никого. Добавьте логин или id выше."
        : "В чёрном списке пока никого. Добавьте логин или id выше.",
    [listTab],
  );

  if (loading) {
    return (
      <div className={`${ADMIN_PANEL_STATE_CENTER_COMPACT} text-white/60`}>
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${ADMIN_PANEL_STATE_CENTER_COMPACT} text-center text-white/80`}>{loadError}</div>
    );
  }

  return (
    <div className={ADMIN_PANEL_PAGE_WIDE}>
      <div className="flex flex-col items-center gap-3">
        <CreditCard className="h-9 w-9 shrink-0 text-[var(--color-brand-gold)]" aria-hidden />
        <div className="max-w-2xl">
          <h1 className={PANEL_PAGE_TITLE_ADMIN_XL_CENTERED}>Приём по платёжным ссылкам</h1>
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
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
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

      <p className="mx-auto w-full max-w-2xl text-center text-sm leading-relaxed text-white/70">
        Лимиты на приём чаевых одному получателю (суточная сумма с учётом только «свежих» неоплаченных заказов, лимит
        одновременных таких же, пауза между заказами, число успешных зачислений за сутки) задаются в разделе{" "}
        <Link
          href="/admin/antifraud"
          className="font-medium text-[var(--color-brand-gold)] underline-offset-2 hover:underline"
        >
          Антифрод
        </Link>
        .
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${ADMIN_PANEL_CARD} flex w-full min-w-0 flex-col items-center gap-3`}>
          <label className="block w-full max-w-lg text-center text-sm font-medium text-white">
            Белый список — добавить
          </label>
          <p className="w-full max-w-lg text-center text-xs leading-relaxed text-white/70">
            Логин или id. Несколько значений — через запятую, пробел или с новой строки (в поле можно вставить
            список).
          </p>
          <div className="w-full max-w-lg">
            <input
              type="text"
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
              value={whitelistDraft}
              onChange={(e) => setWhitelistDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToWhitelist();
                }
              }}
              disabled={saving}
              placeholder="например ivanov или clxxxxxxxx"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={addToWhitelist}>
            Добавить в белый список
          </button>
        </div>

        <div className={`${ADMIN_PANEL_CARD} flex w-full min-w-0 flex-col items-center gap-3`}>
          <label className="block w-full max-w-lg text-center text-sm font-medium text-white">
            Чёрный список — добавить
          </label>
          <p className="w-full max-w-lg text-center text-xs leading-relaxed text-white/70">
            Эти аккаунты не принимают оплату по ссылке, пока глобальный стоп выключен. Формат ввода такой же.
          </p>
          <div className="w-full max-w-lg">
            <input
              type="text"
              className={ADMIN_PANEL_INPUT_FULL_WIDTH}
              value={blacklistDraft}
              onChange={(e) => setBlacklistDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToBlacklist();
                }
              }}
              disabled={saving}
              placeholder="логин или id"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <button type="button" className={BTN_PRIMARY} disabled={saving} onClick={addToBlacklist}>
            Добавить в чёрный список
          </button>
        </div>
      </div>

      <div className={`${ADMIN_PANEL_CARD} !text-left`}>
        <p className="mb-3 text-sm font-medium text-white">Текущие списки</p>
        <div className="flex flex-wrap gap-1 border-b border-white/15 pb-px">
          <button
            type="button"
            className={tabBtn(listTab === "white")}
            onClick={() => setListTab("white")}
          >
            Белый список ({whitelistEntries.length})
          </button>
          <button
            type="button"
            className={tabBtn(listTab === "black")}
            onClick={() => setListTab("black")}
          >
            Чёрный список ({blacklistEntries.length})
          </button>
        </div>

        <div className={tableWrapClass}>
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/15">
                <th className="px-3 py-2 text-left font-medium">Логин или ID</th>
                <th className="w-14 px-2 py-2 text-center font-medium" aria-label="Удалить" />
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-white/60">
                    {emptyHint}
                  </td>
                </tr>
              ) : (
                activeRows.map((e) => {
                  const k = entryKey(e);
                  return (
                    <tr key={k} className="border-b border-white/10">
                      <td className="px-3 py-2.5 font-mono text-white">{e.display}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          className={`${BTN_NEUTRAL} inline-flex h-9 w-9 items-center justify-center !p-0`}
                          disabled={saving}
                          onClick={() => removeActive(k)}
                          aria-label={`Удалить ${e.display}`}
                          title="Удалить из списка"
                        >
                          <X className="h-4 w-4 text-red-300" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
