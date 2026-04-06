/**
 * Режимы приёма чаевых по QR заведения: общий пул vs персональный ЛК официанта + срез %.
 */

import { db } from "@/lib/db";
import { getWaiterPaygineSdRef } from "@/lib/payment/paygine-sd-ref";
import type { TipSplitSnapshot } from "@/lib/payment/gateway";

export const TIP_ROUTING_POOL_QR = "POOL_QR";
export const TIP_ROUTING_EMPLOYEE_QR = "EMPLOYEE_QR";

export type TipRoutingMode = typeof TIP_ROUTING_POOL_QR | typeof TIP_ROUTING_EMPLOYEE_QR;

export function effectiveTipRoutingMode(raw: string | null | undefined): TipRoutingMode {
  if (raw === TIP_ROUTING_EMPLOYEE_QR) return TIP_ROUTING_EMPLOYEE_QR;
  return TIP_ROUTING_POOL_QR;
}

/**
 * Режим «общий счёт / персональный QR» из настроек заведения действует только для сотрудников,
 * привязанных к этому заведению. У ссылки с employeeId без заведения в БД est отсутствует —
 * тогда всегда персональная оплата на ЛК официанта.
 */
export function routingModeForTipLink(
  tipLink: { employeeId: string | null },
  est: { tipRoutingMode: string | null } | null | undefined,
): TipRoutingMode {
  if (tipLink.employeeId && !est) {
    return TIP_ROUTING_EMPLOYEE_QR;
  }
  return effectiveTipRoutingMode(est?.tipRoutingMode);
}

export async function getEstablishmentSharePercent(establishmentId: string): Promise<number> {
  const rule = await db.payoutRule.findFirst({
    where: { establishmentId, type: "establishment_share" },
    select: { value: true },
  });
  if (!rule) return 0;
  const n = Number(rule.value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

/** Доля заведения в копейках от суммы netKop (после удержания комиссии СБП), округление вниз. */
export function poolShareKopFromNet(netKop: bigint, percent: number): bigint {
  if (netKop <= BigInt(0)) return BigInt(0);
  if (!Number.isFinite(percent) || percent <= 0) return BigInt(0);
  const p = Math.min(100, Math.max(0, percent));
  const bps = Math.round(p * 100);
  if (bps <= 0) return BigInt(0);
  if (bps >= 10_000) return netKop;
  return (netKop * BigInt(bps)) / BigInt(10_000);
}

export function parseTipSplitFromPayerInfo(payerInfo: string | null | undefined): TipSplitSnapshot | null {
  if (!payerInfo?.trim()) return null;
  try {
    const o = JSON.parse(payerInfo) as Record<string, unknown>;
    const ts = o.tipSplit as Record<string, unknown> | undefined;
    if (!ts || typeof ts !== "object") return null;
    const poolUserId = typeof ts.poolUserId === "string" ? ts.poolUserId.trim() : "";
    const establishmentSharePercent =
      typeof ts.establishmentSharePercent === "number"
        ? ts.establishmentSharePercent
        : typeof ts.establishmentSharePercent === "string"
          ? Number(ts.establishmentSharePercent)
          : NaN;
    if (!poolUserId || !Number.isFinite(establishmentSharePercent) || establishmentSharePercent <= 0) {
      return null;
    }
    return {
      poolUserId,
      establishmentSharePercent: Math.min(100, Math.max(0, establishmentSharePercent)),
    };
  } catch {
    return null;
  }
}

/** Гарантирует paygineSdRef у пользователя-пула (нужен для Relocate на кубышку заведения). */
export async function ensurePoolUserPaygineSdRef(poolUserId: string): Promise<void> {
  const u = await db.user.findUnique({
    where: { id: poolUserId },
    select: { paygineSdRef: true },
  });
  if (!u?.paygineSdRef?.trim()) {
    await db.user.update({
      where: { id: poolUserId },
      data: { paygineSdRef: getWaiterPaygineSdRef(poolUserId) },
    });
  }
}

/**
 * Синхронизирует TipLink.userId с режимом заведения и создаёт ссылку /pay/{uniqueSlug} на пул.
 */
export async function syncTipLinksForEstablishment(establishmentId: string): Promise<void> {
  const est = await db.establishment.findUnique({
    where: { id: establishmentId },
    select: {
      tipPoolUserId: true,
      uniqueSlug: true,
      tipRoutingMode: true,
    },
  });
  if (!est?.tipPoolUserId) return;

  await ensurePoolUserPaygineSdRef(est.tipPoolUserId);

  const mode = effectiveTipRoutingMode(est.tipRoutingMode);
  const poolId = est.tipPoolUserId;

  const employees = await db.employee.findMany({
    where: { establishmentId },
    select: { id: true, userId: true },
  });

  for (const emp of employees) {
    const link = await db.tipLink.findFirst({
      where: { employeeId: emp.id },
      select: { id: true },
    });
    if (!link) continue;
    const targetUserId = mode === TIP_ROUTING_POOL_QR ? poolId : emp.userId ?? poolId;
    await db.tipLink.update({
      where: { id: link.id },
      data: { userId: targetUserId },
    });
  }

  const slug = est.uniqueSlug?.trim();
  if (slug) {
    await db.tipLink.upsert({
      where: { slug },
      create: {
        userId: poolId,
        slug,
        employeeId: null,
      },
      update: {
        userId: poolId,
        employeeId: null,
      },
    });
  }
}
