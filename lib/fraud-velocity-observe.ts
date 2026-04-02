/**
 * Сигналы наблюдения за «частыми» операциями и общим IP у аккаунтов.
 * Не блокируют операции — только recordFraudSignal для админки.
 */

import { TransactionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { FRAUD_RULE, recordFraudSignal } from "@/lib/fraud-signals";
import { getFraudObserveSettings } from "@/lib/fraud-observe-settings";

const ROLES_EXCLUDED_FROM_SHARED_IP_COUNT = ["ADMIN", "SUPERADMIN"] as const;

export function isMeaningfulClientIp(ip: string): boolean {
  const t = ip.trim();
  if (!t || t === "unknown") return false;
  return true;
}

export function observePayoutVelocityAfterCreate(userId: string): void {
  void observePayoutVelocityAfterCreateAsync(userId);
}

async function observePayoutVelocityAfterCreateAsync(userId: string): Promise<void> {
  const s = await getFraudObserveSettings();
  const windowMs = s.payoutWindowMinutes * 60_000;
  const since = new Date(Date.now() - windowMs);
  const count = await db.payoutRequest.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count < s.payoutMinCount) return;
  await recordFraudSignal({
    userId,
    ruleCode: FRAUD_RULE.PAYOUT_VELOCITY_HOURLY,
    message: `Частые заявки на вывод: ${count} за ${s.payoutWindowMinutes} мин (наблюдение)`,
    metadata: { windowMinutes: s.payoutWindowMinutes, count },
    dedupeMinutes: 90,
  });
}

export function observePayInitBurstForSlug(linkId: string, recipientId: string, slug: string): void {
  void observePayInitBurstForSlugAsync(linkId, recipientId, slug);
}

async function observePayInitBurstForSlugAsync(
  linkId: string,
  recipientId: string,
  slug: string,
): Promise<void> {
  const s = await getFraudObserveSettings();
  const windowMs = s.payInitWindowMinutes * 60_000;
  const since = new Date(Date.now() - windowMs);
  const count = await db.transaction.count({
    where: { linkId, createdAt: { gte: since } },
  });
  if (count < s.payInitMinCount) return;
  await recordFraudSignal({
    userId: recipientId,
    ruleCode: FRAUD_RULE.PAY_INIT_BURST_SLUG,
    message: `Много инициализаций оплат по ссылке за короткое время: ${count} за ${s.payInitWindowMinutes} мин (наблюдение)`,
    metadata: { slug, linkId, windowMinutes: s.payInitWindowMinutes, count },
    dedupeMinutes: 60,
  });
}

export function observeTipSuccessBurstFromInitiatorIp(transactionId: string): void {
  void observeTipSuccessBurstFromInitiatorIpAsync(transactionId);
}

async function observeTipSuccessBurstFromInitiatorIpAsync(transactionId: string): Promise<void> {
  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { initiatorIp: true, recipientId: true, status: true },
  });
  if (!tx || tx.status !== TransactionStatus.SUCCESS || !tx.initiatorIp) return;
  if (!isMeaningfulClientIp(tx.initiatorIp)) return;

  const s = await getFraudObserveSettings();
  const windowMs = s.paySuccessIpWindowMinutes * 60_000;
  const since = new Date(Date.now() - windowMs);
  const count = await db.transaction.count({
    where: {
      initiatorIp: tx.initiatorIp,
      status: TransactionStatus.SUCCESS,
      updatedAt: { gte: since },
    },
  });
  if (count < s.paySuccessIpMinCount) return;

  await recordFraudSignal({
    userId: tx.recipientId,
    ruleCode: FRAUD_RULE.PAY_SUCCESS_BURST_IP,
    message: `Много успешных оплат с одного IP за короткое время: ${count} за ${s.paySuccessIpWindowMinutes} мин (наблюдение)`,
    metadata: {
      windowMinutes: s.paySuccessIpWindowMinutes,
      count,
      transactionId,
    },
    dedupeMinutes: 45,
  });
}

export function observeSharedAuthIp(userId: string, ip: string): void {
  void observeSharedAuthIpAsync(userId, ip);
}

async function observeSharedAuthIpAsync(userId: string, ip: string): Promise<void> {
  if (!isMeaningfulClientIp(ip)) return;

  const s = await getFraudObserveSettings();
  const count = await db.user.count({
    where: {
      lastAuthIp: ip,
      role: { notIn: [...ROLES_EXCLUDED_FROM_SHARED_IP_COUNT] },
    },
  });
  if (count < s.sharedIpMinAccounts) return;

  await recordFraudSignal({
    userId,
    ruleCode: FRAUD_RULE.ACCOUNT_SHARED_AUTH_IP,
    message: `С этим IP связано несколько учётных записей: ${count} (наблюдение, без блокировки)`,
    metadata: { sharedAccountCount: count },
    dedupeMinutes: 360,
  });
}
