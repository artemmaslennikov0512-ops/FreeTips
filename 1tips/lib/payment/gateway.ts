/**
 * Интерфейс платёжного шлюза.
 * Реализации: stub (демо), реальный адаптер — после документации провайдера.
 */

import type { TransactionStatus } from "@prisma/client";

export type CreatePaymentParams = {
  linkId: string;
  recipientId: string;
  amountKop: bigint;
  idempotencyKey: string;
  comment?: string | null;
  /** Базовый URL сайта для url/failurl (редирект после оплаты). Нужен для Paygine. */
  baseUrl?: string;
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
