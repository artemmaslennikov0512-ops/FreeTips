/**
 * Заглушка платёжного шлюза: создаёт Transaction со статусом SUCCESS без внешнего провайдера.
 * Для демо и тестов.
 *
 * Если заданы PAYGINE_SECTOR и PAYGINE_PASSWORD — используется Paygine (тестовый стенд).
 *
 * Webhook: если задан PAYMENT_WEBHOOK_SECRET, подпись проверяется (HMAC-SHA256 от тела).
 * В production без секрета webhook отклоняется (fail closed).
 */

import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import type { PaymentGateway, CreatePaymentParams, CreatePaymentResult, GetStatusResult } from "./gateway";
import { TransactionStatus } from "@prisma/client";
import { broadcastBalanceUpdated } from "@/lib/ws-broadcast";
import { requestPaygineBalance } from "@/lib/payment/request-paygine-balance";
import { PayginePaymentGateway } from "./paygine-gateway";

const WEBHOOK_SIGNATURE_PREFIX = "sha256=";

function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || typeof secret !== "string" || secret.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  if (!signature || typeof signature !== "string") {
    return false;
  }
  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const received = signature.trim().toLowerCase().startsWith(WEBHOOK_SIGNATURE_PREFIX)
    ? signature.trim().slice(WEBHOOK_SIGNATURE_PREFIX.length)
    : signature.trim();
  if (received.length !== expectedHex.length || !/^[a-f0-9]+$/i.test(received)) {
    return false;
  }
  const bufExpected = Buffer.from(expectedHex, "hex");
  const bufActual = Buffer.from(received, "hex");
  return bufExpected.length === bufActual.length && timingSafeEqual(bufExpected, bufActual);
}

export class StubPaymentGateway implements PaymentGateway {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const { linkId, recipientId, amountKop, idempotencyKey, comment } = params;

    const existing = await db.transaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status === TransactionStatus.SUCCESS) {
        return { success: true, transactionId: existing.id };
      }
      return { success: false, error: "Платёж не прошёл" };
    }

    const tx = await db.transaction.create({
      data: {
        linkId,
        recipientId,
        amountKop,
        payerInfo: comment ? JSON.stringify({ comment }) : null,
        status: TransactionStatus.SUCCESS,
        idempotencyKey,
      },
      select: { id: true },
    });

    void broadcastBalanceUpdated(recipientId);
    void requestPaygineBalance(recipientId);

    return { success: true, transactionId: tx.id };
  }

  async getStatus(transactionId: string): Promise<GetStatusResult> {
    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      select: { status: true },
    });
    return tx ? { status: tx.status } : null;
  }

  async handleWebhook(rawBody: string, signature: string | null): Promise<{ ok: boolean }> {
    return { ok: verifyWebhookSignature(rawBody, signature) };
  }
}

let instance: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (!instance) {
    const sector = process.env.PAYGINE_SECTOR;
    const password = process.env.PAYGINE_PASSWORD;
    if (sector && password) {
      instance = new PayginePaymentGateway();
    } else {
      instance = new StubPaymentGateway();
    }
  }
  return instance;
}
