/**
 * Платёжный шлюз Paygine по документу Оглавление1.
 * Пополнение: только картой (Register → SDPayIn). Webhook: XML от ПЦ, подпись по Приложению №2.
 */

import { db } from "@/lib/db";
import { getAppUrl, getPaygineConfig, getNodeEnv, getPaygineSdRefLegal, getPaygineRelocateDelayMs, getPaygineRelocateRetryMs } from "@/lib/config";
import type {
  PaymentGateway,
  CreatePaymentParams,
  CreatePaymentResult,
  GetStatusResult,
} from "./gateway";
import { TransactionStatus } from "@prisma/client";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { logInfo } from "@/lib/logger";
import { RELOCATE_CLAIM_STALE_MS } from "@/lib/payment/relocate-constants";
import { messageFromUnknown } from "@/lib/errors";
import { scheduleRelocate } from "@/lib/payment/relocate-queue";
import { registerOrder, sdRelocateFunds } from "./paygine/client";
import { buildPaygineSignature } from "./paygine/signature";
import { feeKopForIncoming } from "./paygine-fee";
import { paymentAcceptBlockedReasonForRecipient } from "@/lib/payment-accept-guard";
import { observeTipSuccessBurstFromInitiatorIp } from "@/lib/fraud-velocity-observe";
import { parseTipSplitFromPayerInfo, poolShareKopFromNet } from "@/lib/tip-routing";

/** Базовый URL для редиректов: канонический из env, иначе из запроса (для dev). Paygine требует абсолютный URL. */
function getBaseForRedirect(baseUrlFromRequest: string | undefined): string {
  const fromEnv = getAppUrl().trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const fromReq = baseUrlFromRequest?.trim().replace(/\/$/, "");
  return fromReq ?? "";
}

const CURRENCY_RUB = 643;

/** Текст ошибки Register от Paygine (часто XML description или JSON) → понятное сообщение для API. */
function formatPaygineRegisterUserError(raw: string | undefined): string {
  const d = (raw ?? "").trim();
  if (!d) return "Ошибка регистрации заказа Paygine";
  if (/invalid signature/i.test(d) || /<code>\s*109\s*<\/code>/i.test(d)) {
    return (
      "Paygine: неверная подпись (код 109). На сервере проверьте PAYGINE_PASSWORD и PAYGINE_SECTOR — без кавычек, пробелов и переносов в конце строки в .env; " +
      "PAYGINE_BASE_URL должен соответствовать контуру учётки (прод: https://pay.paygine.com/webapi, тест: https://test.paygine.com/webapi)."
    );
  }
  return d.length > 400 ? `${d.slice(0, 400)}…` : d;
}

/** Уникальная кубышка заказа (временная). После оплаты — Relocate на кубышку официанта. */
function createOrderSdRef(transactionId: string): string {
  const safe = transactionId.replace(/-/g, "").slice(0, 20);
  return `1tips_t_${safe}_${Date.now().toString(36)}`;
}

function getConfig(): { sector: string; password: string } | null {
  return getPaygineConfig();
}

type TipRelocateExecutionPlan = {
  orderSdRef: string;
  feeToCompanyKop: number;
  isSbp: boolean;
  companySdRef: string;
  steps: { toSdRef: string; amountKop: number; feeKop?: number; desc: string }[];
  establishmentShareKop: bigint | null;
  poolShareRecipientId: string | null;
  recipientCreditedKop: bigint;
  recipientFeeChargedKop: bigint;
  hasPendingWork: boolean;
};

/**
 * План перелива с кубышки заказа: комиссия ЮЛ (СБП), затем доля заведения и/или официант.
 */
function computeTipRelocateExecutionPlan(input: {
  amountKop: unknown;
  feeKop: unknown;
  paymentMethod: string | null | undefined;
  paygineOrderSdRef: string | null | undefined;
  recipientPaygineSdRef: string | null | undefined;
  poolPaygineSdRef: string | null | undefined;
  payerInfo: string | null | undefined;
}): TipRelocateExecutionPlan | null {
  const orderSdRef = (input.paygineOrderSdRef ?? "").trim();
  if (!orderSdRef) return null;

  const isSbp = (input.paymentMethod ?? "") === "sbp";
  const method: "card" | "sbp" = isSbp ? "sbp" : "card";
  const companySdRef = getPaygineSdRefLegal();
  const amountNum = Number(input.amountKop);
  const payerPayload = (() => {
    try {
      return input.payerInfo ? (JSON.parse(input.payerInfo) as { paygineFeePayer?: unknown }) : {};
    } catch {
      return {};
    }
  })();
  const storedFeeKopNum = Number(input.feeKop ?? 0);
  const feeKopNum =
    storedFeeKopNum > 0
      ? storedFeeKopNum
      : payerPayload.paygineFeePayer === "recipient"
        ? feeKopForIncoming(amountNum, method)
        : 0;
  const feeToCompanyKop = isSbp && companySdRef && feeKopNum > 0 ? feeKopNum : 0;
  const netAfterFeeNum = feeToCompanyKop > 0 ? amountNum - feeToCompanyKop : amountNum;
  const netKop = BigInt(Math.max(0, Math.floor(netAfterFeeNum)));

  const waiterSdRef = input.recipientPaygineSdRef?.trim() || undefined;
  const poolSdRef = input.poolPaygineSdRef?.trim() || undefined;

  const tipSplit = parseTipSplitFromPayerInfo(input.payerInfo ?? null);
  let establishmentShareKop: bigint | null = null;
  let poolShareRecipientId: string | null = null;
  let recipientCreditedKop = BigInt(0);
  const steps: { toSdRef: string; amountKop: number; feeKop?: number; desc: string }[] = [];

  if (
    tipSplit &&
    tipSplit.establishmentSharePercent > 0 &&
    poolSdRef &&
    poolSdRef !== orderSdRef
  ) {
    const poolKop = poolShareKopFromNet(netKop, tipSplit.establishmentSharePercent);
    const cardRelocateFeeKop = !isSbp && feeKopNum > 0 ? BigInt(feeKopNum) : BigInt(0);
    const waiterKopRaw = netKop - poolKop;
    const waiterKop = waiterKopRaw - cardRelocateFeeKop;
    if (poolKop >= BigInt(1)) {
      steps.push({
        toSdRef: poolSdRef,
        amountKop: Number(poolKop),
        desc: "Доля заведения (чаевые)",
      });
      establishmentShareKop = poolKop;
      poolShareRecipientId = tipSplit.poolUserId;
    }
    if (waiterKop >= BigInt(1) && waiterSdRef && waiterSdRef !== orderSdRef) {
      steps.push({
        toSdRef: waiterSdRef,
        amountKop: Number(waiterKop),
        ...(cardRelocateFeeKop > BigInt(0) ? { feeKop: Number(cardRelocateFeeKop) } : {}),
        desc: `Перевод чаевых → ${waiterSdRef}`,
      });
      recipientCreditedKop = waiterKop;
    }
  } else if (waiterSdRef && orderSdRef !== waiterSdRef) {
    const cardRelocateFeeKop = !isSbp && feeKopNum > 0 ? feeKopNum : 0;
    const toWaiterKop = Math.max(0, Number(netKop) - cardRelocateFeeKop);
    if (toWaiterKop >= 1) {
      steps.push({
        toSdRef: waiterSdRef,
        amountKop: toWaiterKop,
        ...(cardRelocateFeeKop > 0 ? { feeKop: cardRelocateFeeKop } : {}),
        desc: `Перевод чаевых → ${waiterSdRef}`,
      });
      recipientCreditedKop = BigInt(toWaiterKop);
    }
  }

  const recipientFeeChargedKop = isSbp
    ? BigInt(Math.max(0, feeToCompanyKop))
    : BigInt(Math.max(0, feeKopNum));

  const feeWork = feeToCompanyKop >= 1 && !!companySdRef;
  const stepWork = steps.some((s) => s.amountKop >= 1);
  const hasPendingWork = feeWork || stepWork;

  return {
    orderSdRef,
    feeToCompanyKop,
    isSbp,
    companySdRef,
    steps,
    establishmentShareKop,
    poolShareRecipientId,
    recipientCreditedKop,
    recipientFeeChargedKop,
    hasPendingWork,
  };
}

/**
 * Приложение №3: подпись колбэка = значения всех тегов в порядке следования + password (Приложение №2).
 * Парсим XML и собираем значения тегов (кроме signature) в порядке появления.
 * Теги могут быть в любом регистре (Reference, state и т.д.).
 */
function parseXmlTagsInOrder(xml: string): { tagValues: string[]; signature: string | null } {
  const tagValues: string[] = [];
  let signature: string | null = null;
  const tagRe = /<([a-zA-Z0-9_]+)>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(xml)) !== null) {
    const tagName = m[1].toLowerCase();
    const value = m[2];
    if (tagName === "signature") {
      signature = value;
    } else {
      tagValues.push(value);
    }
  }
  return { tagValues, signature };
}

function verifyPaygineCallbackSignature(xml: string, password: string): boolean {
  const { tagValues, signature } = parseXmlTagsInOrder(xml);
  if (!signature) return false;
  const expected = buildPaygineSignature(tagValues, password);
  return expected === signature;
}

export class PayginePaymentGateway implements PaymentGateway {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const config = getConfig();
    if (!config) {
      return { success: false, error: "Paygine не настроен" };
    }

    const { linkId, recipientId, amountKop, idempotencyKey, comment, baseUrl, initiatorIp, tipSplit } =
      params;
    const amount = Number(amountKop);
    if (!Number.isInteger(amount) || amount < 100) {
      return { success: false, error: "Сумма слишком мала" };
    }

    const tipLink = await db.tipLink.findUnique({
      where: { id: linkId },
      select: { slug: true },
    });
    if (!tipLink) {
      return { success: false, error: "Ссылка для чаевых не найдена" };
    }
    const linkSlug = tipLink.slug.trim();
    const paymentPagePath = `/pay/${linkSlug}`;

    const existing = await db.transaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, externalId: true },
    });

    const base = getBaseForRedirect(baseUrl);
    if (!base) {
      const msg =
        getNodeEnv() === "production"
          ? "Задайте NEXT_PUBLIC_APP_URL в окружении (production)"
          : "Не указан baseUrl для редиректа";
      return { success: false, error: msg };
    }

    if (existing) {
      if (existing.status === TransactionStatus.SUCCESS) {
        return { success: true, transactionId: existing.id };
      }
      if (existing.status === TransactionStatus.PENDING && existing.externalId) {
        const redirectUrl = `${base}/pay/redirect?tid=${existing.id}`;
        return { success: true, transactionId: existing.id, redirectUrl };
      }
      return { success: false, error: "Платёж уже создан и не завершён" };
    }

    const blockedReason = await paymentAcceptBlockedReasonForRecipient(recipientId);
    if (blockedReason) {
      return { success: false, error: blockedReason };
    }

    const feeKop = feeKopForIncoming(amount, "card");
    const payerPayload: Record<string, unknown> = {
      comment: comment ?? undefined,
      paygineMethod: "card",
      paygineFeePayer: "recipient",
    };
    if (tipSplit && tipSplit.establishmentSharePercent > 0) {
      payerPayload.tipSplit = {
        poolUserId: tipSplit.poolUserId,
        establishmentSharePercent: tipSplit.establishmentSharePercent,
      };
    }
    const tx = await db.transaction.create({
      data: {
        linkId,
        recipientId,
        amountKop,
        feeKop: feeKop > 0 ? BigInt(feeKop) : null,
        paymentMethod: "card",
        payerInfo: JSON.stringify(payerPayload),
        status: TransactionStatus.PENDING,
        idempotencyKey,
        initiatorIp: initiatorIp?.trim() || null,
      },
      select: { id: true },
    });

    // Абсолютные URL обязательны для редиректа Paygine (в т.ч. с мобильных).
    const successUrl = `${base}${paymentPagePath}?tid=${tx.id}&outcome=success`;
    const failUrl = `${base}${paymentPagePath}?tid=${tx.id}&outcome=fail`;
    const notifyUrl = `${base}/api/payment/webhook`;
    const orderSdRef = createOrderSdRef(tx.id);

    const regResult = await registerOrder(
      { sector: config.sector, password: config.password },
      {
        amount,
        currency: CURRENCY_RUB,
        reference: idempotencyKey,
        /** Описание заказа в ЛК Paygine = код официанта из пути /pay/{код} */
        description: linkSlug.slice(0, 1000),
        url: successUrl,
        failurl: failUrl,
        notify_url: notifyUrl,
        sd_ref: orderSdRef,
      }
    );

    if (!regResult.ok) {
      await db.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.FAILED },
      });
      return {
        success: false,
        error: formatPaygineRegisterUserError(regResult.description),
      };
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        externalId: String(regResult.orderId),
        paygineOrderSdRef: orderSdRef,
      },
    });

    const redirectUrl = `${base}/pay/redirect?tid=${tx.id}`;
    return { success: true, transactionId: tx.id, redirectUrl };
  }

  async getStatus(transactionId: string): Promise<GetStatusResult> {
    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      select: { status: true },
    });
    return tx ? { status: tx.status } : null;
  }

  async handleWebhook(rawBody: string, signature: string | null): Promise<{ ok: boolean }> {
    void signature; // interface requires param; verification uses rawBody + config.password
    const config = getConfig();
    if (!config) return { ok: false };

    if (!verifyPaygineCallbackSignature(rawBody, config.password)) {
      logInfo("payment.webhook.signature_invalid", { bodyLength: rawBody.length });
      return { ok: false };
    }

    // Поддержка разного регистра тегов в XML (Reference, reference, State, state и т.д.)
    const referenceMatch = rawBody.match(/<reference>([^<]*)<\/reference>/i);
    const stateMatch = rawBody.match(/<state>([^<]*)<\/state>/i);
    const orderStateMatch = rawBody.match(/<order_state>([^<]*)<\/order_state>/i);
    const operationIdMatch = rawBody.match(/<id>(\d+)<\/id>/i);

    const reference = referenceMatch?.[1]?.trim();
    if (!reference) {
      logInfo("payment.webhook.no_reference", { bodyLength: rawBody.length });
      return { ok: true };
    }

    logInfo("payment.webhook.callback", {
      referenceLen: reference.length,
      referencePrefix: reference.slice(0, 48),
      bodyLength: rawBody.length,
    });

    const tx = await db.transaction.findUnique({
      where: { idempotencyKey: reference },
      select: {
        id: true,
        status: true,
        recipientId: true,
        amountKop: true,
        feeKop: true,
        paymentMethod: true,
        paygineOrderSdRef: true,
        payerInfo: true,
      },
    });

    // reference может быть id заявки на вывод (SDPayOutPage): Paygine шлёт callback с reference = payout.id
    if (!tx) {
      const payout = await db.payoutRequest.findUnique({
        where: { id: reference, status: "PROCESSING" },
        select: { id: true, userId: true, details: true },
      });
      if (payout) {
        const state = stateMatch?.[1]?.trim().toUpperCase();
        const orderState = orderStateMatch?.[1]?.trim().toUpperCase();
        const success = state === "APPROVED" || orderState === "COMPLETED";
        const panRaw =
          rawBody.match(/<pan2>([^<]*)<\/pan2>/i)?.[1]?.trim() ??
          rawBody.match(/<pan>([^<]*)<\/pan>/i)?.[1]?.trim() ??
          "";
        const pan = panRaw ? panRaw.replace(/\s+/g, "") : "";
        const panMasked = pan ? `****${pan.slice(-4)}` : "";
        const codeMatch = rawBody.match(/<code>([^<]*)<\/code>/i);
        const descMatch = rawBody.match(/<description>([^<]*)<\/description>/i);
        const rejectionReason =
          !success && (codeMatch?.[1] || descMatch?.[1])
            ? [codeMatch?.[1]?.trim(), descMatch?.[1]?.trim()].filter(Boolean).join(": ").slice(0, 500)
            : undefined;
        const alreadyHasCard = /Карта:\s*\S+/i.test(payout.details);
        const detailsWithPan = !alreadyHasCard && panMasked
          ? `${payout.details}; Карта: ${panMasked}`.slice(0, 1000)
          : payout.details;
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: success ? "COMPLETED" : "REJECTED",
            details: detailsWithPan,
            ...(rejectionReason && { rejectionReason }),
          },
        });
        logInfo("payment.webhook.payout_updated", {
          payoutId: payout.id,
          status: success ? "COMPLETED" : "REJECTED",
          state: state ?? null,
          orderState: orderState ?? null,
          ...(rejectionReason ? { pcRejectionReason: rejectionReason } : {}),
        });
        void broadcastBalanceUpdated(payout.userId);
      } else {
        logInfo("payment.webhook.unknown_reference", {
          referencePrefix: reference.slice(0, 48),
          hint: "Нет Transaction с таким idempotencyKey и нет PayoutRequest PROCESSING с таким id",
        });
      }
      return { ok: true };
    }

    if (tx.status !== TransactionStatus.PENDING) {
      logInfo("payment.webhook.tip_skip_not_pending", {
        transactionId: tx.id,
        status: tx.status,
        referencePrefix: reference.slice(0, 48),
      });
      return { ok: true };
    }

    const state = stateMatch?.[1]?.trim().toUpperCase();
    const orderState = orderStateMatch?.[1]?.trim().toUpperCase();
    const success = state === "APPROVED" || orderState === "COMPLETED";

    const orderSdRefTrim = tx.paygineOrderSdRef?.trim();
    const recipient = orderSdRefTrim
      ? await db.user.findUnique({
          where: { id: tx.recipientId },
          select: { paygineSdRef: true },
        })
      : null;
    const tipSplit = parseTipSplitFromPayerInfo(tx.payerInfo);
    const poolUserForSplit = tipSplit
      ? await db.user.findUnique({
          where: { id: tipSplit.poolUserId },
          select: { paygineSdRef: true },
        })
      : null;
    const relocatePlan = orderSdRefTrim
      ? computeTipRelocateExecutionPlan({
          amountKop: tx.amountKop,
          feeKop: tx.feeKop,
          paymentMethod: tx.paymentMethod,
          paygineOrderSdRef: orderSdRefTrim,
          recipientPaygineSdRef: recipient?.paygineSdRef,
          poolPaygineSdRef: poolUserForSplit?.paygineSdRef,
          payerInfo: tx.payerInfo,
        })
      : null;

    const setStatusImmediately =
      !success ? TransactionStatus.FAILED
      : !relocatePlan || !relocatePlan.hasPendingWork
        ? TransactionStatus.SUCCESS
        : TransactionStatus.PENDING;

    // Не перезаписываем externalId: это id заказа Register, нужен для webapi/Order и синка с ПЦ.
    // Id операции из колбэка — только в payerInfo (диагностика).
    let mergedPayerInfo: string | undefined;
    if (operationIdMatch?.[1]) {
      try {
        const prev = tx.payerInfo ? (JSON.parse(tx.payerInfo) as Record<string, unknown>) : {};
        mergedPayerInfo = JSON.stringify({
          ...prev,
          paygineCallbackOperationId: operationIdMatch[1],
        });
      } catch {
        mergedPayerInfo = JSON.stringify({
          paygineCallbackOperationId: operationIdMatch[1],
        });
      }
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        status: setStatusImmediately,
        ...(mergedPayerInfo && { payerInfo: mergedPayerInfo }),
        ...(setStatusImmediately === TransactionStatus.SUCCESS && relocatePlan
          ? {
              ...(relocatePlan.establishmentShareKop != null
                ? { establishmentShareKop: relocatePlan.establishmentShareKop }
                : {}),
              ...(relocatePlan.poolShareRecipientId
                ? { poolShareRecipientId: relocatePlan.poolShareRecipientId }
                : {}),
              recipientCreditedKop: relocatePlan.recipientCreditedKop,
              recipientFeeChargedKop: relocatePlan.recipientFeeChargedKop,
            }
          : {}),
      },
    });

    logInfo("payment.webhook.processed", {
      transactionId: tx.id,
      status: setStatusImmediately,
      state: state ?? null,
      orderState: orderState ?? null,
    });

    if (success && setStatusImmediately === TransactionStatus.SUCCESS) {
      void broadcastBalanceUpdated(tx.recipientId);
      observeTipSuccessBurstFromInitiatorIp(tx.id);
    }

    if (success && setStatusImmediately === TransactionStatus.PENDING && relocatePlan) {
      void scheduleRelocate(tx.id);
    }

    return { ok: true };
  }
}

/**
 * Выполняет перелив с кубышки заказа на кубышку официанта и ставит SUCCESS.
 * Вызывается из вебхука и из sync-transaction-statuses (запоздалый вебхук / опрос Paygine).
 */
export async function runRelocateForTransaction(txId: string): Promise<{ ok: boolean }> {
  const config = getConfig();
  if (!config) return { ok: false };

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    select: {
      id: true,
      status: true,
      paygineOrderSdRef: true,
      recipientId: true,
      paymentMethod: true,
      feeKop: true,
      amountKop: true,
      relocateStartedAt: true,
      payerInfo: true,
    },
  });
  if (!tx || tx.status !== TransactionStatus.PENDING || !tx.paygineOrderSdRef?.trim()) {
    return { ok: false };
  }

  if (tx.relocateStartedAt) {
    const age = Date.now() - new Date(tx.relocateStartedAt).getTime();
    if (age > RELOCATE_CLAIM_STALE_MS) {
      await db.transaction.updateMany({
        where: { id: txId, status: TransactionStatus.PENDING },
        data: { relocateStartedAt: null },
      });
      logInfo("payment.relocate.stale_claim_reset", { transactionId: txId, staleAgeMs: age });
    }
  }

  const orderSdRef = tx.paygineOrderSdRef.trim();
  const recipient = await db.user.findUnique({
    where: { id: tx.recipientId },
    select: { paygineSdRef: true },
  });
  const tipSplitForRelocate = parseTipSplitFromPayerInfo(tx.payerInfo);
  const poolUserForRelocate = tipSplitForRelocate
    ? await db.user.findUnique({
        where: { id: tipSplitForRelocate.poolUserId },
        select: { paygineSdRef: true },
      })
    : null;
  const plan = computeTipRelocateExecutionPlan({
    amountKop: tx.amountKop,
    feeKop: tx.feeKop,
    paymentMethod: tx.paymentMethod,
    paygineOrderSdRef: orderSdRef,
    recipientPaygineSdRef: recipient?.paygineSdRef,
    poolPaygineSdRef: poolUserForRelocate?.paygineSdRef,
    payerInfo: tx.payerInfo,
  });

  if (!plan || !plan.hasPendingWork) {
    await db.transaction.update({
      where: { id: txId },
      data: {
        status: TransactionStatus.SUCCESS,
        ...(plan?.establishmentShareKop != null ? { establishmentShareKop: plan.establishmentShareKop } : {}),
        ...(plan?.poolShareRecipientId ? { poolShareRecipientId: plan.poolShareRecipientId } : {}),
        recipientCreditedKop: plan?.recipientCreditedKop ?? BigInt(0),
        recipientFeeChargedKop: plan?.recipientFeeChargedKop ?? BigInt(0),
      },
    });
    void broadcastBalanceUpdated(tx.recipientId);
    if (plan?.poolShareRecipientId) void broadcastBalanceUpdated(plan.poolShareRecipientId);
    observeTipSuccessBurstFromInitiatorIp(txId);
    return { ok: true };
  }

  const claimed = await db.transaction.updateMany({
    where: { id: txId, status: TransactionStatus.PENDING, relocateStartedAt: null },
    data: { relocateStartedAt: new Date() },
  });
  if (claimed.count === 0) {
    logInfo("payment.relocate.claim_skipped", {
      transactionId: txId,
      hint: "Другой инстанс держит перелив или relocateStartedAt не null (повторите через минуту или дождитесь сброса по таймауту)",
    });
    return { ok: false };
  }

  const delayMs = getPaygineRelocateDelayMs();
  const retryDelayMs = getPaygineRelocateRetryMs();

  try {
    await new Promise((r) => setTimeout(r, delayMs));

    const doRelocate = async (amount: number, toSdRef: string, desc: string, feeKop?: number) => {
      const reg = await registerOrder(config, {
        amount,
        currency: CURRENCY_RUB,
        reference: `relocate-${txId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        description: desc.slice(0, 1000),
        ...(feeKop && feeKop > 0 ? { fee: feeKop } : {}),
      });
      if (!reg.ok) return { ok: false, code: reg.code, description: reg.description };
      let rel = await sdRelocateFunds(config, {
        orderId: reg.orderId,
        fromSdRef: orderSdRef,
        toSdRef,
      });
      if (!rel.ok && rel.code === "133") {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        rel = await sdRelocateFunds(config, { orderId: reg.orderId, fromSdRef: orderSdRef, toSdRef });
      }
      return rel.ok
        ? { ok: true as const }
        : {
            ok: false as const,
            code: rel.code,
            description: rel.description,
            debugBody: rel.debugBody,
          };
    };

    if (plan.isSbp && plan.companySdRef && plan.feeToCompanyKop > 0) {
      const relFee = await doRelocate(
        plan.feeToCompanyKop,
        plan.companySdRef,
        `Комиссия ЮЛ (чаевые ${txId})`,
      );
      if (!relFee.ok) {
        logInfo("payment.webhook.relocate_failed", {
          transactionId: txId,
          code: relFee.code,
          description: relFee.description,
          toSdRef: plan.companySdRef,
          role: "fee_legal",
          ...(relFee.debugBody && { paygineResponsePreview: relFee.debugBody }),
        });
      }
    }

    let stepsOk = true;
    let lastFail: { code?: string; description?: string; debugBody?: string } = {};
    for (const step of plan.steps) {
      const rel = await doRelocate(step.amountKop, step.toSdRef, step.desc, step.feeKop);
      if (!rel.ok) {
        stepsOk = false;
        lastFail = {
          code: rel.code,
          description: rel.description,
          ...(rel.debugBody && { debugBody: rel.debugBody }),
        };
        break;
      }
    }

    if (stepsOk) {
      await db.transaction.update({
        where: { id: txId },
        data: {
          status: TransactionStatus.SUCCESS,
          ...(plan.establishmentShareKop != null ? { establishmentShareKop: plan.establishmentShareKop } : {}),
          ...(plan.poolShareRecipientId ? { poolShareRecipientId: plan.poolShareRecipientId } : {}),
          recipientCreditedKop: plan.recipientCreditedKop,
          recipientFeeChargedKop: plan.recipientFeeChargedKop,
        },
      });
      void broadcastBalanceUpdated(tx.recipientId);
      if (plan.poolShareRecipientId) void broadcastBalanceUpdated(plan.poolShareRecipientId);
      observeTipSuccessBurstFromInitiatorIp(txId);
    } else {
      logInfo("payment.webhook.relocate_failed", {
        transactionId: txId,
        code: lastFail.code,
        description: lastFail.description,
        hint: "Ручной перелив: npx tsx scripts/utils/relocate-one-transaction.ts " + txId,
        ...(lastFail.debugBody && { paygineResponsePreview: lastFail.debugBody }),
      });
      await db.transaction.update({ where: { id: txId }, data: { status: TransactionStatus.FAILED } });
    }
    return { ok: true };
  } catch (err) {
    logInfo("payment.webhook.relocate_error", {
      transactionId: txId,
      error: messageFromUnknown(err),
    });
    await db.transaction.updateMany({
      where: { id: txId, status: TransactionStatus.PENDING },
      data: { relocateStartedAt: null },
    });
    return { ok: false };
  }
}
