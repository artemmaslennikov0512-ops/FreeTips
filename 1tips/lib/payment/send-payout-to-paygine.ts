/**
 * Отправка заявки на вывод в Paygine: SDPayOut с кубышки официанта на карту.
 * Требуется: у пользователя задан paygineSdRef и в запросе передан pan (номер карты).
 */

import { db } from "@/lib/db";
import { getBalance } from "@/lib/balance";
import { sdPayOut } from "@/lib/payment/paygine/client";
import { feeKopForPayout } from "@/lib/payment/paygine-fee";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";

export type SendPayoutToPaygineOptions = {
  /** Номер карты для вывода (SDPayOut). Обязателен. */
  pan?: string;
  completedByUserId?: string | null;
};

export type SendPayoutToPaygineResult =
  | { success: true; operationId?: string; precheck_id: string }
  | { success: false; error: string; code?: string; description?: string };

export async function sendPayoutToPaygine(
  payoutId: string,
  options: SendPayoutToPaygineOptions = {}
): Promise<SendPayoutToPaygineResult> {
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD?.trim();
  if (!sector || !password) {
    return { success: false, error: "Paygine не настроен" };
  }

  const payout = await db.payoutRequest.findUnique({
    where: { id: payoutId },
    select: { id: true, userId: true, amountKop: true, status: true, details: true, externalId: true },
  });

  if (!payout) {
    return { success: false, error: "Заявка не найдена" };
  }

  const canSend = payout.status === "CREATED" || payout.status === "PROCESSING"
    || (payout.status === "COMPLETED" && !payout.externalId);
  if (!canSend) {
    return { success: false, error: "Выплату можно отправить только со статусом CREATED, PROCESSING или Выполнена без Paygine (externalId пустой)" };
  }

  const amount = Number(payout.amountKop);
  if (!Number.isInteger(amount) || amount < 1) {
    return { success: false, error: "Некорректная сумма заявки" };
  }

  const pan = options.pan?.replace(/\s/g, "").trim();
  if (!pan || pan.length < 8) {
    return { success: false, error: "Для вывода на карту укажите номер карты (pan)" };
  }

  const user = await db.user.findUnique({
    where: { id: payout.userId },
    select: { paygineSdRef: true },
  });
  const sdRef = user?.paygineSdRef?.trim();
  if (!sdRef) {
    return { success: false, error: "У пользователя не задана кубышка Paygine (paygineSdRef)" };
  }

  const feeKop = feeKopForPayout(amount);
  const totalDebitKop = amount + feeKop;
  const { balanceKop } = await getBalance(payout.userId);
  if (BigInt(totalDebitKop) > balanceKop) {
    return {
      success: false,
      error: "Недостаточно средств на балансе (с учётом комиссии вывода)",
    };
  }

  const config = { sector, password };
  const description = (payout.details ?? "Вывод").trim().slice(0, 250) || "Вывод";

  const payOutResult = await sdPayOut(config, {
    sdRef,
    pan,
    amountKop: amount,
    description,
    feeKop: feeKop > 0 ? feeKop : undefined,
  });

  if (!payOutResult.ok) {
    return {
      success: false,
      error: "Ошибка вывода на карту (SDPayOut)",
      code: payOutResult.code,
      description: payOutResult.description,
    };
  }

  await db.payoutRequest.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      externalId: payOutResult.operationId ?? undefined,
      feeKop: feeKop > 0 ? BigInt(feeKop) : null,
      ...(options.completedByUserId != null && { completedByUserId: options.completedByUserId }),
    },
  });

  void broadcastBalanceUpdated(payout.userId);
  void requestPaygineBalance(payout.userId);

  return {
    success: true,
    precheck_id: payOutResult.operationId ?? "sdpayout",
    operationId: payOutResult.operationId,
  };
}

/** Включена ли автоотправка новых заявок в Paygine (Paygine настроен). */
export function isPayginePayoutAutoSendEnabled(): boolean {
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD?.trim();
  return !!(sector && password);
}
