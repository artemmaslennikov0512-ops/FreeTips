"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [recipientMaxDailyIncomingRubles, setRecipientMaxDailyIncomingRubles] = useState("");
  const [recipientMaxConcurrentPending, setRecipientMaxConcurrentPending] = useState("");
  const [recipientMinMinutesBetweenPayInits, setRecipientMinMinutesBetweenPayInits] = useState("");
  const [recipientMaxPayInitsPerDay, setRecipientMaxPayInitsPerDay] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);

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
          paymentWhitelistUserIds?: string[];
          paymentBlacklistUserIds?: string[];
          whitelistText?: string;
          blacklistText?: string;
          recipientMaxDailyIncomingRubles?: number | null;
          recipientMaxConcurrentPendingPayments?: number | null;
          recipientMinMinutesBetweenPayInits?: number | null;
          recipientMaxPayInitsPerDay?: number | null;
        };
        setGlobalOff(data.globalPaymentsDisabled);
        applyServerLists(data);
        if (data.recipientMaxDailyIncomingRubles != null && Number.isFinite(data.recipientMaxDailyIncomingRubles)) {
          setRecipientMaxDailyIncomingRubles(String(data.recipientMaxDailyIncomingRubles));
        } else {
          setRecipientMaxDailyIncomingRubles("");
        }
        if (
          data.recipientMaxConcurrentPendingPayments != null &&
          Number.isFinite(data.recipientMaxConcurrentPendingPayments)
        ) {
          setRecipientMaxConcurrentPending(String(data.recipientMaxConcurrentPendingPayments));
        } else {
          setRecipientMaxConcurrentPending("");
        }
        if (
          data.recipientMinMinutesBetweenPayInits != null &&
          Number.isFinite(data.recipientMinMinutesBetweenPayInits)
        ) {
          setRecipientMinMinutesBetweenPayInits(String(data.recipientMinMinutesBetweenPayInits));
        } else {
          setRecipientMinMinutesBetweenPayInits("");
        }
        if (
          data.recipientMaxPayInitsPerDay != null &&
          Number.isFinite(data.recipientMaxPayInitsPerDay)
        ) {
          setRecipientMaxPayInitsPerDay(String(data.recipientMaxPayInitsPerDay));
        } else {
          setRecipientMaxPayInitsPerDay("");
        }
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

  const saveRecipientLimits = () => {
    const balRaw = recipientMaxDailyIncomingRubles.trim().replace(",", ".");
    let recipientMaxDailyIncomingRublesPayload: number | null;
    if (balRaw === "") {
      recipientMaxDailyIncomingRublesPayload = null;
    } else {
      const n = Number(balRaw);
      if (!Number.isFinite(n) || n < 0) {
        setMessage({
          type: "err",
          text: "Суточная сумма входящих: введите неотрицательное число рублей или оставьте пустым.",
        });
        return;
      }
      recipientMaxDailyIncomingRublesPayload = n;
    }

    const concRaw = recipientMaxConcurrentPending.trim();
    let recipientMaxConcurrentPendingPayments: number | null;
    if (concRaw === "") {
      recipientMaxConcurrentPendingPayments = null;
    } else {
      const c = parseInt(concRaw, 10);
      if (!Number.isFinite(c) || c < 1 || c > 100) {
        setMessage({ type: "err", text: "Незавершённые оплаты: целое число от 1 до 100 или пусто (без лимита)." });
        return;
      }
      recipientMaxConcurrentPendingPayments = c;
    }

    const intervalRaw = recipientMinMinutesBetweenPayInits.trim();
    let recipientMinMinutesBetweenPayInitsPayload: number | null;
    if (intervalRaw === "") {
      recipientMinMinutesBetweenPayInitsPayload = null;
    } else {
      const w = parseInt(intervalRaw, 10);
      if (!Number.isFinite(w) || w < 1 || w > 10080) {
        setMessage({
          type: "err",
          text: "Интервал: целое число минут от 1 до 10080 или пусто (без паузы между заказами).",
        });
        return;
      }
      recipientMinMinutesBetweenPayInitsPayload = w;
    }

    const dailyRaw = recipientMaxPayInitsPerDay.trim();
    let recipientMaxPayInitsPerDayPayload: number | null;
    if (dailyRaw === "") {
      recipientMaxPayInitsPerDayPayload = null;
    } else {
      const d = parseInt(dailyRaw, 10);
      if (!Number.isFinite(d) || d < 1 || d > 50_000) {
        setMessage({
          type: "err",
          text: "Входящих за сутки: целое число от 1 до 50 000 или пусто (без лимита).",
        });
        return;
      }
      recipientMaxPayInitsPerDayPayload = d;
    }

    setSavingLimits(true);
    setMessage(null);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setSavingLimits(false);
      return;
    }
    void (async () => {
      try {
        const res = await fetch("/api/admin/payment-accept", {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientMaxDailyIncomingRubles: recipientMaxDailyIncomingRublesPayload,
            recipientMaxConcurrentPendingPayments,
            recipientMinMinutesBetweenPayInits: recipientMinMinutesBetweenPayInitsPayload,
            recipientMaxPayInitsPerDay: recipientMaxPayInitsPerDayPayload,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          recipientMaxDailyIncomingRubles?: number | null;
          recipientMaxConcurrentPendingPayments?: number | null;
          recipientMinMinutesBetweenPayInits?: number | null;
          recipientMaxPayInitsPerDay?: number | null;
        };
        if (!res.ok) {
          setMessage({ type: "err", text: data.error ?? "Ошибка сохранения лимитов" });
          return;
        }
        if (data.recipientMaxDailyIncomingRubles != null && Number.isFinite(data.recipientMaxDailyIncomingRubles)) {
          setRecipientMaxDailyIncomingRubles(String(data.recipientMaxDailyIncomingRubles));
        } else {
          setRecipientMaxDailyIncomingRubles("");
        }
        if (
          data.recipientMaxConcurrentPendingPayments != null &&
          Number.isFinite(data.recipientMaxConcurrentPendingPayments)
        ) {
          setRecipientMaxConcurrentPending(String(data.recipientMaxConcurrentPendingPayments));
        } else {
          setRecipientMaxConcurrentPending("");
        }
        if (
          data.recipientMinMinutesBetweenPayInits != null &&
          Number.isFinite(data.recipientMinMinutesBetweenPayInits)
        ) {
          setRecipientMinMinutesBetweenPayInits(String(data.recipientMinMinutesBetweenPayInits));
        } else {
          setRecipientMinMinutesBetweenPayInits("");
        }
        if (
          data.recipientMaxPayInitsPerDay != null &&
          Number.isFinite(data.recipientMaxPayInitsPerDay)
        ) {
          setRecipientMaxPayInitsPerDay(String(data.recipientMaxPayInitsPerDay));
        } else {
          setRecipientMaxPayInitsPerDay("");
        }
        setMessage({ type: "ok", text: "Лимиты получателя сохранены." });
      } catch {
        setMessage({ type: "err", text: "Ошибка соединения" });
      } finally {
        setSavingLimits(false);
      }
    })();
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
          <h1 className="text-center font-[family:var(--font-playfair)] text-2xl font-semibold text-white">
            Приём по платёжным ссылкам
          </h1>
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

      <div className={`${ADMIN_PANEL_CARD} mx-auto w-full max-w-2xl`}>
        <h2 className="text-center font-[family:var(--font-playfair)] text-lg font-semibold text-white">
          Лимиты для получателя чаевых
        </h2>
        <p className="mt-2 text-center text-sm text-white/75">
          Учитывается пользователь, на чей баланс уходит оплата по этой ссылке (официант или пул). Лимит
          незавершённых оплат — только заказы в статусе ожидания оплаты в Paygine.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-1">
          <div>
            <label className="block text-sm font-medium text-white" htmlFor="recipient-max-daily-incoming">
              Макс. сумма входящих за сутки (₽, МСК)
            </label>
            <p className="mt-1 text-xs text-white/65">
              Пусто — без лимита. За сутки МСК: уже зачислено сегодня (SUCCESS по времени зачисления) + незавершённые,
              созданные сегодня, + новый платёж. Гостю при срабатывании этого лимита показывается нейтральное сообщение.
              Месячный потолок поступлений — поле «месячный лимит поступлений (чаевые)» в карточке пользователя (UTC-месяц);
              лимит вывода в месяц на него не влияет. Если не задан — месячный лимит поступлений не действует.
            </p>
            <input
              id="recipient-max-daily-incoming"
              type="text"
              inputMode="decimal"
              className={`${ADMIN_PANEL_INPUT_FULL_WIDTH} mt-2`}
              value={recipientMaxDailyIncomingRubles}
              onChange={(e) => setRecipientMaxDailyIncomingRubles(e.target.value)}
              disabled={saving || savingLimits}
              placeholder="например 5000"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white" htmlFor="recipient-max-pending">
              Одновременно незавершённых заказов не больше (шт.)
            </label>
            <p className="mt-1 text-xs text-white/65">
              Пусто — без лимита. Все заказы в ожидании оплаты (PENDING) у этого получателя; как только
              оплата прошла или заказ снят, слот освобождается.
            </p>
            <input
              id="recipient-max-pending"
              type="text"
              inputMode="numeric"
              className={`${ADMIN_PANEL_INPUT_FULL_WIDTH} mt-2`}
              value={recipientMaxConcurrentPending}
              onChange={(e) => setRecipientMaxConcurrentPending(e.target.value)}
              disabled={saving || savingLimits}
              placeholder="например 2"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white" htmlFor="recipient-pay-interval">
              Минимальный интервал между созданием заказов (мин.)
            </label>
            <p className="mt-1 text-xs text-white/65">
              Пусто — без паузы. Отсчёт от времени создания предыдущего заказа для этого же получателя
              (включая уже оплаченные). Учитывайте: при интервале несколько гостей не смогут подряд
              инициировать чаевые на одного официанта чаще указанного срока.
            </p>
            <input
              id="recipient-pay-interval"
              type="text"
              inputMode="numeric"
              className={`${ADMIN_PANEL_INPUT_FULL_WIDTH} mt-2`}
              value={recipientMinMinutesBetweenPayInits}
              onChange={(e) => setRecipientMinMinutesBetweenPayInits(e.target.value)}
              disabled={saving || savingLimits}
              placeholder="например 5"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white" htmlFor="recipient-max-pay-inits-day">
              Успешных зачислений за сутки не больше (шт., МСК)
            </label>
            <p className="mt-1 text-xs text-white/65">
              Пусто — без лимита. Считаются только успешные зачисления (SUCCESS по времени зачисления) для этого
              получателя с полуночи до полуночи по Москве. Гостю на странице оплаты при достижении лимита показывается
              нейтральное сообщение (внутренняя политика).
            </p>
            <input
              id="recipient-max-pay-inits-day"
              type="text"
              inputMode="numeric"
              className={`${ADMIN_PANEL_INPUT_FULL_WIDTH} mt-2`}
              value={recipientMaxPayInitsPerDay}
              onChange={(e) => setRecipientMaxPayInitsPerDay(e.target.value)}
              disabled={saving || savingLimits}
              placeholder="например 20"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={saving || savingLimits}
            onClick={saveRecipientLimits}
          >
            {savingLimits ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Сохранение…
              </span>
            ) : (
              "Сохранить лимиты"
            )}
          </button>
        </div>
      </div>

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
