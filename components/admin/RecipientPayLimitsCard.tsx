"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
import { fetchWithAuth } from "@/lib/auth-client";
import {
  ADMIN_PANEL_ALERT_OK,
  ADMIN_PANEL_ALERT_WARN,
  ADMIN_PANEL_CARD,
  ADMIN_PANEL_INPUT_STRETCH,
} from "@/lib/admin-surface-classes";

const BTN_PRIMARY = `${ADMIN_BTN} ${ADMIN_BTN_PRIMARY} px-5 py-2.5 text-sm disabled:opacity-50`;

type PaymentAcceptLimitsPayload = {
  recipientMaxDailyIncomingRubles?: number | null;
  recipientMaxConcurrentPendingPayments?: number | null;
  recipientMinMinutesBetweenPayInits?: number | null;
  recipientMaxPayInitsPerDay?: number | null;
};

/**
 * Глобальные лимиты приёма чаевых на одного получателя (сумма/день, pending, интервал, число успехов).
 * Данные — PATCH/GET `/api/admin/payment-accept`.
 */
export function RecipientPayLimitsCard({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipientMaxDailyIncomingRubles, setRecipientMaxDailyIncomingRubles] = useState("");
  const [recipientMaxConcurrentPending, setRecipientMaxConcurrentPending] = useState("");
  const [recipientMinMinutesBetweenPayInits, setRecipientMinMinutesBetweenPayInits] = useState("");
  const [recipientMaxPayInitsPerDay, setRecipientMaxPayInitsPerDay] = useState("");
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsMessage, setLimitsMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const applyLimitsFromPayload = useCallback((data: PaymentAcceptLimitsPayload) => {
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
    if (data.recipientMaxPayInitsPerDay != null && Number.isFinite(data.recipientMaxPayInitsPerDay)) {
      setRecipientMaxPayInitsPerDay(String(data.recipientMaxPayInitsPerDay));
    } else {
      setRecipientMaxPayInitsPerDay("");
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetchWithAuth("/api/admin/payment-accept");
        if (!res.ok) {
          setLoadError("Не удалось загрузить лимиты");
          return;
        }
        const data = (await res.json()) as PaymentAcceptLimitsPayload;
        applyLimitsFromPayload(data);
      } catch {
        setLoadError("Ошибка соединения");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [applyLimitsFromPayload]);

  const saveRecipientLimits = () => {
    const balRaw = recipientMaxDailyIncomingRubles.trim().replace(",", ".");
    let recipientMaxDailyIncomingRublesPayload: number | null;
    if (balRaw === "") {
      recipientMaxDailyIncomingRublesPayload = null;
    } else {
      const n = Number(balRaw);
      if (!Number.isFinite(n) || n < 0) {
        setLimitsMessage({
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
        setLimitsMessage({
          type: "err",
          text: "Незавершённые оплаты: целое число от 1 до 100 или пусто (без лимита).",
        });
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
        setLimitsMessage({
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
        setLimitsMessage({
          type: "err",
          text: "Входящих за сутки: целое число от 1 до 50 000 или пусто (без лимита).",
        });
        return;
      }
      recipientMaxPayInitsPerDayPayload = d;
    }

    setSavingLimits(true);
    setLimitsMessage(null);
    void (async () => {
      try {
        const res = await fetchWithAuth("/api/admin/payment-accept", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientMaxDailyIncomingRubles: recipientMaxDailyIncomingRublesPayload,
            recipientMaxConcurrentPendingPayments,
            recipientMinMinutesBetweenPayInits: recipientMinMinutesBetweenPayInitsPayload,
            recipientMaxPayInitsPerDay: recipientMaxPayInitsPerDayPayload,
          }),
        });
        const data = (await res.json()) as { error?: string } & PaymentAcceptLimitsPayload;
        if (!res.ok) {
          setLimitsMessage({ type: "err", text: data.error ?? "Ошибка сохранения лимитов" });
          return;
        }
        applyLimitsFromPayload(data);
        setLimitsMessage({ type: "ok", text: "Лимиты получателя сохранены." });
      } catch {
        setLimitsMessage({ type: "err", text: "Ошибка соединения" });
      } finally {
        setSavingLimits(false);
      }
    })();
  };

  if (loading) {
    return (
      <div className={`${ADMIN_PANEL_CARD} flex min-h-[120px] items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-white/50" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`${ADMIN_PANEL_CARD} text-center text-white/80 ${className}`}>{loadError}</div>
    );
  }

  return (
    <div className={`${ADMIN_PANEL_CARD} w-full min-w-0 !text-left ${className}`}>
      <h2 className="text-center font-[family:var(--font-playfair)] text-base font-semibold text-white">
        Лимиты приёма чаевых
      </h2>
      <p className="mt-1.5 text-center text-xs text-white/75">
        Баланс получателя по ссылке (официант или пул). «Ожидающие» — только PENDING в Paygine.
      </p>

      {limitsMessage && (
        <div
          role="status"
          className={`mt-4 ${limitsMessage.type === "ok" ? ADMIN_PANEL_ALERT_OK : ADMIN_PANEL_ALERT_WARN}`}
        >
          {limitsMessage.text}
        </div>
      )}

      <div className="mt-4 w-full min-w-0 space-y-3 px-0 sm:px-1">
        <div className="w-full min-w-0">
          <label className="block text-xs font-medium text-white" htmlFor="recipient-max-daily-incoming">
            Макс. входящих за сутки (₽, МСК)
          </label>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Пусто = нет лимита. Счёт: зачислено сегодня + сегодняшние ожидающие + новый платёж. Месячный потолок — в
            карточке пользователя.
          </p>
          <input
            id="recipient-max-daily-incoming"
            type="text"
            inputMode="decimal"
            className={`${ADMIN_PANEL_INPUT_STRETCH} mt-2 min-w-0`}
            value={recipientMaxDailyIncomingRubles}
            onChange={(e) => setRecipientMaxDailyIncomingRubles(e.target.value)}
            disabled={savingLimits}
            placeholder="например 5000"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="w-full min-w-0">
          <label className="block text-xs font-medium text-white" htmlFor="recipient-max-pending">
            Одновременно ожидающих оплат (шт.)
          </label>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">Пусто = нет лимита. Слот освобождается после оплаты или отмены.</p>
          <input
            id="recipient-max-pending"
            type="text"
            inputMode="numeric"
            className={`${ADMIN_PANEL_INPUT_STRETCH} mt-2 min-w-0`}
            value={recipientMaxConcurrentPending}
            onChange={(e) => setRecipientMaxConcurrentPending(e.target.value)}
            disabled={savingLimits}
            placeholder="например 2"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="w-full min-w-0">
          <label className="block text-xs font-medium text-white" htmlFor="recipient-pay-interval">
            Пауза между новыми оплатами (мин.)
          </label>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Пусто = без паузы. От предыдущего создания заказа у этого получателя.
          </p>
          <input
            id="recipient-pay-interval"
            type="text"
            inputMode="numeric"
            className={`${ADMIN_PANEL_INPUT_STRETCH} mt-2 min-w-0`}
            value={recipientMinMinutesBetweenPayInits}
            onChange={(e) => setRecipientMinMinutesBetweenPayInits(e.target.value)}
            disabled={savingLimits}
            placeholder="например 5"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="w-full min-w-0">
          <label className="block text-xs font-medium text-white" htmlFor="recipient-max-pay-inits-day">
            Успешных зачислений за сутки (шт., МСК)
          </label>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Пусто = нет лимита. SUCCESS с 00:00 до 00:00 МСК по времени зачисления.
          </p>
          <input
            id="recipient-max-pay-inits-day"
            type="text"
            inputMode="numeric"
            className={`${ADMIN_PANEL_INPUT_STRETCH} mt-2 min-w-0`}
            value={recipientMaxPayInitsPerDay}
            onChange={(e) => setRecipientMaxPayInitsPerDay(e.target.value)}
            disabled={savingLimits}
            placeholder="например 20"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-center">
        <button type="button" className={BTN_PRIMARY} disabled={savingLimits} onClick={saveRecipientLimits}>
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
  );
}
