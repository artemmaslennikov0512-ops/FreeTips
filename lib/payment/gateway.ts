/**
 * Интерфейс платёжного шлюза.
 * Реализации: stub (демо), реальный адаптер — после документации провайдера.
 */

import type { TransactionStatus } from "@prisma/client";

/** Снимок для перелива: доля на пул заведения (%) с личного QR официанта. */
export type TipSplitSnapshot = {
  poolUserId: string;
  establishmentSharePercent: number;
};

export type CreatePaymentParams = {
  linkId: string;
  recipientId: string;
  amountKop: bigint;
  idempotencyKey: string;
  comment?: string | null;
  /** Базовый URL сайта для url/failurl (редирект после оплаты). Нужен для Paygine. */
  baseUrl?: string;
  /** IP инициатора (страница оплаты); для наблюдения скорости успешных оплат, без блокировок */
  initiatorIp?: string | null;
  /** Если задано, после оплаты net сумма делится: часть на пул, остаток получателю (recipientId). */
  tipSplit?: TipSplitSnapshot | null;
};

export type CreatePaymentResult =
  | { success: true; transactionId: string; redirectUrl?: string }
  | { success: false; error: string };

export type GetStatusResult = { status: TransactionStatus } | null;

export interface PaymentGateway {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  getStatus(transactionId: string): Promise<GetStatusResult>;

  /**
   * Обработка вебхука от провайдера. Проверка подписи, обновление Transaction.
   * @returns ok: true — обработан или заглушка; false — неверная подпись/ошибка.
   */
  handleWebhook(rawBody: string, signature: string | null): Promise<{ ok: boolean }>;
}
