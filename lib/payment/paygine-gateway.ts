/**
 * Платёжный шлюз Paygine по документу Оглавление1.
 * Пополнение: только картой (Register → SDPayIn). Webhook: XML от ПЦ, подпись по Приложению №2.
 */

import { db } from "@/lib/db";
import type {
  PaymentGateway,
  CreatePaymentParams,
  CreatePaymentResult,
  GetStatusResult,
} from "./gateway";
import { TransactionStatus } from "@prisma/client";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";
import { logInfo } from "@/lib/logger";
import { registerOrder, sdRelocateFunds } from "./paygine/client";
import { buildPaygineSignature } from "./paygine/signature";
import { feeKopForIncoming } from "./paygine-fee";

const CURRENCY_RUB = 643;

/** Уникальная кубышка заказа (временная). После оплаты — Relocate на кубышку официанта. */
function createOrderSdRef(transactionId: string): string {
  const safe = transactionId.replace(/-/g, "").slice(0, 20);
  return `1tips_t_${safe}_${Date.now().toString(36)}`;
}

function getConfig(): { sector: string; password: string } | null {
  const sector = process.env.PAYGINE_SECTOR;
  const password = process.env.PAYGINE_PASSWORD;
  if (!sector || !password) return null;
  return { sector, password };
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

    const { linkId, recipientId, amountKop, idempotencyKey, comment, baseUrl } = params;
    const amount = Number(amountKop);
    if (!Number.isInteger(amount) || amount < 100) {
      return { success: false, error: "Сумма слишком мала" };
    }

    const existing = await db.transaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, externalId: true },
    });

    if (existing) {
      if (existing.status === TransactionStatus.SUCCESS) {
        return { success: true, transactionId: existing.id };
      }
      if (existing.status === TransactionStatus.PENDING && existing.externalId) {
        const redirectUrl = baseUrl ? `${baseUrl}/pay/redirect?tid=${existing.id}` : undefined;
        return { success: true, transactionId: existing.id, redirectUrl };
      }
      return { success: false, error: "Платёж уже создан и не завершён" };
    }

    if (!baseUrl) {
      return { success: false, error: "Не указан baseUrl для редиректа" };
    }

    const feeKop = feeKopForIncoming(amount, "card");
    const tx = await db.transaction.create({
      data: {
        linkId,
        recipientId,
        amountKop,
        feeKop: null,
        paymentMethod: "card",
        payerInfo: JSON.stringify({ comment: comment ?? undefined, paygineMethod: "card" }),
        status: TransactionStatus.PENDING,
        idempotencyKey,
      },
      select: { id: true },
    });

    const successUrl = `${baseUrl}/pay/result?tid=${tx.id}&outcome=success`;
    const failUrl = `${baseUrl}/pay/result?tid=${tx.id}&outcome=fail`;
    const notifyUrl = `${baseUrl}/api/payment/webhook`;
    const orderSdRef = createOrderSdRef(tx.id);

    const regResult = await registerOrder(
      { sector: config.sector, password: config.password },
      {
        amount,
        currency: CURRENCY_RUB,
        reference: idempotencyKey,
        description: "Чаевые",
        fee: feeKop > 0 ? feeKop : undefined,
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
      return { success: false, error: regResult.description ?? "Ошибка регистрации заказа" };
    }

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        externalId: String(regResult.orderId),
        paygineOrderSdRef: orderSdRef,
      },
    });

    const redirectUrl = `${baseUrl}/pay/redirect?tid=${tx.id}`;
    return { success: true, transactionId: tx.id, redirectUrl };
  }

  async getStatus(transactionId: string): Promise<GetStatusResult> {
    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      select: { status: true },
    });
    return tx ? { status: tx.status } : null;
  }

  async handleWebhook(rawBody: string, _signature: string | null): Promise<{ ok: boolean }> {
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
    if (!reference) return { ok: true };

    let tx = await db.transaction.findUnique({
      where: { idempotencyKey: reference },
      select: { id: true, status: true, recipientId: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true },
    });

    // reference может быть id заявки на вывод (SDPayOutPage): Paygine шлёт callback с reference = payout.id
    if (!tx) {
      const payout = await db.payoutRequest.findUnique({
        where: { id: reference, status: "PROCESSING" },
        select: { id: true, userId: true },
      });
      if (payout) {
        const state = rawBody.match(/<state>([^<]*)<\/state>/i)?.[1]?.trim().toUpperCase();
        const orderState = rawBody.match(/<order_state>([^<]*)<\/order_state>/i)?.[1]?.trim().toUpperCase();
        const success = state === "APPROVED" || orderState === "COMPLETED";
        const codeMatch = rawBody.match(/<code>([^<]*)<\/code>/i);
        const descMatch = rawBody.match(/<description>([^<]*)<\/description>/i);
        const rejectionReason =
          !success && (codeMatch?.[1] || descMatch?.[1])
            ? [codeMatch?.[1]?.trim(), descMatch?.[1]?.trim()].filter(Boolean).join(": ").slice(0, 500)
            : undefined;
        await db.payoutRequest.update({
          where: { id: payout.id },
          data: {
            status: success ? "COMPLETED" : "REJECTED",
            ...(rejectionReason && { rejectionReason }),
          },
        });
        logInfo("payment.webhook.payout_updated", {
          payoutId: payout.id,
          status: success ? "COMPLETED" : "REJECTED",
          state: state ?? null,
          orderState: orderState ?? null,
        });
        void broadcastBalanceUpdated(payout.userId);
        void requestPaygineBalance(payout.userId);
      }
      return { ok: true };
    }

    if (tx.status !== TransactionStatus.PENDING) return { ok: true };

    const state = stateMatch?.[1]?.trim().toUpperCase();
    const orderState = orderStateMatch?.[1]?.trim().toUpperCase();
    const success = state === "APPROVED" || orderState === "COMPLETED";

    const orderSdRef = tx.paygineOrderSdRef?.trim();
    const recipient = orderSdRef
      ? await db.user.findUnique({
          where: { id: tx.recipientId },
          select: { paygineSdRef: true },
        })
      : null;
    const waiterSdRef = recipient?.paygineSdRef?.trim();
    const willRelocateToWaiter =
      !!orderSdRef &&
      !!waiterSdRef &&
      orderSdRef !== waiterSdRef &&
      (() => {
        const isSbp = tx.paymentMethod === "sbp";
        const companySdRef = process.env.PAYGINE_SD_REF_LEGAL?.trim();
        const feeKopNum = Number(tx.feeKop ?? 0);
        const amountKopNum = Number(tx.amountKop);
        const toWaiterKop = isSbp && companySdRef && feeKopNum > 0 ? amountKopNum - feeKopNum : amountKopNum;
        return toWaiterKop >= 1;
      })();

    const setStatusImmediately =
      !success ? TransactionStatus.FAILED
      : !orderSdRef || !waiterSdRef || orderSdRef === waiterSdRef || !willRelocateToWaiter
        ? TransactionStatus.SUCCESS
        : TransactionStatus.PENDING;

    await db.transaction.update({
      where: { id: tx.id },
      data: {
        status: setStatusImmediately,
        ...(operationIdMatch?.[1] && { externalId: operationIdMatch[1] }),
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
      void requestPaygineBalance(tx.recipientId);
    }

    if (success && setStatusImmediately === TransactionStatus.PENDING) {
      if (!orderSdRef) {
        logInfo("payment.webhook.relocate_skipped", {
          reason: "no_paygineOrderSdRef",
          transactionId: tx.id,
          hint: "Транзакция создана без кубышки заказа (старый поток?).",
        });
      } else if (!waiterSdRef) {
        logInfo("payment.webhook.relocate_skipped", {
          reason: "no_waiter_paygineSdRef",
          transactionId: tx.id,
          recipientId: tx.recipientId,
          hint: "У получателя не задан paygineSdRef (кубышка официанта). Заполните User.paygineSdRef или пересоздайте пользователя.",
        });
      } else if (orderSdRef === waiterSdRef) {
        logInfo("payment.webhook.relocate_skipped", {
          reason: "same_sd_ref",
          transactionId: tx.id,
          hint: "Кубышка заказа совпадает с кубышкой официанта — перелив не нужен.",
        });
      } else {
        // Заявка на перелив: только один вызов вебхука запускает перелив (если в Paygine указаны оба URL — callback приходит дважды)
        const claimed = await db.transaction.updateMany({
          where: {
            id: tx.id,
            status: TransactionStatus.PENDING,
            relocateStartedAt: null,
          },
          data: { relocateStartedAt: new Date() },
        });
        if (claimed.count === 0) {
          logInfo("payment.webhook.relocate_skipped", {
            reason: "already_started",
            transactionId: tx.id,
            hint: "Перелив уже запущен другим вызовом вебхука (идемпотентность).",
          });
        } else {
        const delayMs = Number(process.env.PAYGINE_RELOCATE_DELAY_MS) || 10_000;
        const retryDelayMs = Number(process.env.PAYGINE_RELOCATE_RETRY_MS) || 8_000;
        const isSbp = tx.paymentMethod === "sbp";
        const companySdRef = process.env.PAYGINE_SD_REF_LEGAL?.trim();
        const feeKopNum = Number(tx.feeKop ?? 0);
        const amountKopNum = Number(tx.amountKop);
        const toWaiterKop = isSbp && companySdRef && feeKopNum > 0 ? amountKopNum - feeKopNum : amountKopNum;

        void (async () => {
          try {
          await new Promise((r) => setTimeout(r, delayMs));

          const doRelocate = async (amount: number, toSdRef: string, desc: string) => {
            const reg = await registerOrder(config, {
              amount,
              currency: CURRENCY_RUB,
              reference: `relocate-${tx.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              description: desc.slice(0, 1000),
            });
            if (!reg.ok) return { ok: false, code: reg.code, description: reg.description };
            let rel = await sdRelocateFunds(config, {
              orderId: reg.orderId,
              fromSdRef: orderSdRef,
              toSdRef,
            });
            if (!rel.ok && rel.code === "133") {
              await new Promise((r) => setTimeout(r, retryDelayMs));
              rel = await sdRelocateFunds(config, {
                orderId: reg.orderId,
                fromSdRef: orderSdRef,
                toSdRef,
              });
            }
            return rel.ok ? { ok: true } : { ok: false, code: rel.code, description: rel.description };
          };

          if (isSbp && companySdRef && feeKopNum > 0) {
            const relFee = await doRelocate(
              feeKopNum,
              companySdRef,
              `Комиссия ЮЛ (чаевые ${tx.id})`
            );
            if (relFee.ok) {
              logInfo("payment.webhook.relocate_ok", {
                transactionId: tx.id,
                toSdRef: companySdRef,
                amountKop: feeKopNum,
                role: "fee_legal",
              });
            } else {
              logInfo("payment.webhook.relocate_failed", {
                transactionId: tx.id,
                code: relFee.code,
                description: relFee.description,
                toSdRef: companySdRef,
                role: "fee_legal",
              });
            }
          }

          if (toWaiterKop < 1) {
            if (isSbp && companySdRef && feeKopNum > 0 && amountKopNum <= feeKopNum) {
              logInfo("payment.webhook.relocate_skipped", {
                transactionId: tx.id,
                reason: "amount_leq_fee",
                hint: "Вся сумма ушла в комиссию ЮЛ.",
              });
            }
            await db.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.SUCCESS },
            });
            void broadcastBalanceUpdated(tx.recipientId);
            void requestPaygineBalance(tx.recipientId);
            return;
            }

          const relWaiter = await doRelocate(
            toWaiterKop,
            waiterSdRef,
            `Перевод чаевых → ${waiterSdRef}`
          );
          if (relWaiter.ok) {
            logInfo("payment.webhook.relocate_ok", {
              transactionId: tx.id,
              toSdRef: waiterSdRef,
              amountKop: toWaiterKop,
            });
            await db.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.SUCCESS },
            });
            void broadcastBalanceUpdated(tx.recipientId);
            void requestPaygineBalance(tx.recipientId);
          } else {
            logInfo("payment.webhook.relocate_failed", {
              transactionId: tx.id,
              code: relWaiter.code,
              description: relWaiter.description,
              hint: "Ручной перелив: npx tsx scripts/utils/relocate-one-transaction.ts " + tx.id,
            });
            await db.transaction.update({
              where: { id: tx.id },
              data: { status: TransactionStatus.FAILED },
            });
          }
          } catch (err) {
            logInfo("payment.webhook.relocate_error", {
              transactionId: tx.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })();
        }
      }
    }

    return { ok: true };
  }
}
