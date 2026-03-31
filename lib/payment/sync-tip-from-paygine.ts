/**
 * Синхронизация одной транзакции чаевых с Paygine (webapi/Order).
 * Закрывает разрыв, когда в ПЦ заказ уже COMPLETED, а вебхук не обновил БД или перелив не отработал.
 */

import { TransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getPaygineConfig } from "@/lib/config";
import { getOrderStatus } from "@/lib/payment/paygine/client";
import { runRelocateForTransaction } from "@/lib/payment/paygine-gateway";
import { logInfo } from "@/lib/logger";

export type SyncTipFromPaygineOptions = {
  /**
   * Для cron/admin: если в Paygine заказ не COMPLETED — пометить транзакцию FAILED.
   * Для гостя после оплаты не использовать (заказ может ещё обрабатываться).
   */
  failIfPaygineNotCompleted?: boolean;
};

export type SyncTipFromPaygineResult = {
  ok: boolean;
  status: TransactionStatus;
  paygineOrderState?: string;
  error?: string;
  /** Было PENDING, после перелива стало SUCCESS */
  recovered?: boolean;
  /** Выставили FAILED из-за статуса Paygine (только с failIfPaygineNotCompleted) */
  markedFailed?: boolean;
};

export async function syncTipTransactionFromPaygine(
  txId: string,
  options: SyncTipFromPaygineOptions = {},
): Promise<SyncTipFromPaygineResult> {
  const config = getPaygineConfig();
  if (!config) {
    logInfo("payment.sync_paygine.skip", { transactionId: txId, reason: "paygine_not_configured" });
    return { ok: false, status: TransactionStatus.PENDING, error: "Paygine не настроен" };
  }

  const tx = await db.transaction.findUnique({
    where: { id: txId },
    select: { id: true, status: true, externalId: true },
  });

  if (!tx) {
    logInfo("payment.sync_paygine.skip", { transactionId: txId, reason: "transaction_not_found" });
    return { ok: false, status: TransactionStatus.PENDING, error: "Транзакция не найдена" };
  }

  if (tx.status !== TransactionStatus.PENDING && tx.status !== TransactionStatus.SUCCESS) {
    logInfo("payment.sync_paygine.skip", { transactionId: txId, reason: "terminal_status", status: tx.status });
    return { ok: true, status: tx.status };
  }

  if (tx.status === TransactionStatus.SUCCESS && !options.failIfPaygineNotCompleted) {
    logInfo("payment.sync_paygine.skip", { transactionId: txId, reason: "already_success" });
    return { ok: true, status: TransactionStatus.SUCCESS };
  }

  if (!tx.externalId?.trim()) {
    logInfo("payment.sync_paygine.skip", { transactionId: txId, reason: "no_external_id", dbStatus: tx.status });
    return { ok: false, status: tx.status, error: "Нет externalId заказа Paygine" };
  }

  const orderId = parseInt(tx.externalId.trim(), 10);
  if (!Number.isInteger(orderId)) {
    logInfo("payment.sync_paygine.skip", {
      transactionId: txId,
      reason: "external_id_not_integer",
      externalIdPrefix: tx.externalId.trim().slice(0, 24),
    });
    return { ok: false, status: tx.status, error: "Некорректный externalId" };
  }

  const result = await getOrderStatus(config, orderId);
  if (!result.ok) {
    logInfo("payment.sync_paygine.order_query_failed", {
      transactionId: txId,
      orderId,
      code: result.code ?? null,
      description: result.description ?? null,
    });
    return {
      ok: false,
      status: tx.status,
      error: result.description ?? result.code ?? "Ошибка запроса Order",
    };
  }

  const orderState = result.orderState;

  if (orderState === "COMPLETED") {
    if (tx.status === TransactionStatus.PENDING) {
      logInfo("payment.sync_paygine.order_completed_relocate", { transactionId: txId, orderId });
      await runRelocateForTransaction(txId);
      const updated = await db.transaction.findUnique({
        where: { id: txId },
        select: { status: true },
      });
      const after = updated?.status ?? tx.status;
      const recovered =
        tx.status === TransactionStatus.PENDING && after === TransactionStatus.SUCCESS;
      logInfo("payment.sync_paygine.after_relocate", {
        transactionId: txId,
        orderId,
        dbStatusAfter: after,
        recovered,
      });
      return {
        ok: true,
        status: after,
        paygineOrderState: orderState,
        recovered,
      };
    }
    logInfo("payment.sync_paygine.order_completed_no_relocate", {
      transactionId: txId,
      orderId,
      dbStatus: tx.status,
    });
    return { ok: true, status: tx.status, paygineOrderState: orderState };
  }

  if (options.failIfPaygineNotCompleted) {
    await db.transaction.update({
      where: { id: txId },
      data: { status: TransactionStatus.FAILED },
    });
    logInfo("payment.sync_paygine.marked_failed", { transactionId: txId, orderId, paygineOrderState: orderState });
    return {
      ok: true,
      status: TransactionStatus.FAILED,
      paygineOrderState: orderState,
      markedFailed: true,
    };
  }

  logInfo("payment.sync_paygine.wait_paygine", {
    transactionId: txId,
    orderId,
    paygineOrderState: orderState,
    dbStatus: tx.status,
  });
  return { ok: true, status: tx.status, paygineOrderState: orderState };
}
