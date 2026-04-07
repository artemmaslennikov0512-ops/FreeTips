"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ADMIN_BTN, ADMIN_BTN_PRIMARY } from "@/lib/admin-button-classes";
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
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      try {
        const res = await fetch("/api/admin/payment-accept", {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      <h2 className="text-center font-[family:var(--font-playfair)] text-lg font-semibold text-white">
        Лимиты для получателя чаевых
      </h2>
      <p className="mt-2 text-center text-sm text-white/75">
        Учитывается пользователь, на чей баланс уходит оплата по этой ссылке (официант или пул). Лимит
        незавершённых оплат — только заказы в статусе ожидания оплаты в Paygine.
      </p>

      {limitsMessage && (
        <div
          role="status"
          className={`mt-4 ${limitsMessage.type === "ok" ? ADMIN_PANEL_ALERT_OK : ADMIN_PANEL_ALERT_WARN}`}
        >
          {limitsMessage.text}
        </div>
      )}

      <div className="mt-6 w-full min-w-0 space-y-5 px-0 sm:px-1">
        <div className="w-full min-w-0">
          <label className="block text-sm font-medium text-white" htmlFor="recipient-max-daily-incoming">
            Макс. сумма входящих за сутки (₽, МСК)
          </label>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            Пусто — без лимита. За сутки МСК: уже зачислено сегодня (SUCCESS по времени зачисления) + незавершённые,
            созданные сегодня, + новый платёж. Гостю при срабатывании этого лимита показывается нейтральное сообщение.
            Месячный потолок поступлений — поле «месячный лимит поступлений (чаевые)» в карточке пользователя (UTC-месяц);
            лимит вывода в месяц на него не влияет. Если не задан — месячный лимит поступлений не действует.
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
          <label className="block text-sm font-medium text-white" htmlFor="recipient-max-pending">
            Одновременно незавершённых заказов не больше (шт.)
          </label>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            Пусто — без лимита. Все заказы в ожидании оплаты (PENDING) у этого получателя; как только
            оплата прошла или заказ снят, слот освобождается.
          </p>
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
          <label className="block text-sm font-medium text-white" htmlFor="recipient-pay-interval">
            Минимальный интервал между созданием заказов (мин.)
          </label>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            Пусто — без паузы. Отсчёт от времени создания предыдущего заказа для этого же получателя
            (включая уже оплаченные). Учитывайте: при интервале несколько гостей не смогут подряд
            инициировать чаевые на одного официанта чаще указанного срока.
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
          <label className="block text-sm font-medium text-white" htmlFor="recipient-max-pay-inits-day">
            Успешных зачислений за сутки не больше (шт., МСК)
          </label>
          <p className="mt-1 text-xs leading-relaxed text-white/65">
            Пусто — без лимита. Считаются только успешные зачисления (SUCCESS по времени зачисления) для этого
            получателя с полуночи до полуночи по Москве. Гостю на странице оплаты при достижении лимита показывается
            нейтральное сообщение (внутренняя политика).
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
      <div className="mt-6 flex justify-center">
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
