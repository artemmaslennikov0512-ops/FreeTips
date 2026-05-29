/**
 * Заполняет transaction.recipientCreditedKop / recipientFeeChargedKop для исторических SUCCESS-чаевых.
 * Источник: текущая доменная логика (amount, fee, split, payerInfo).
 *
 * Запуск:
 *   npx tsx scripts/backfill-transaction-relocate-facts.ts --dry-run
 *   npx tsx scripts/backfill-transaction-relocate-facts.ts --apply
 *   npx tsx scripts/backfill-transaction-relocate-facts.ts --user-id <id> --apply
 */

import "dotenv/config";
import { PrismaClient, TransactionStatus } from "@prisma/client";
import { loadScriptsEnv } from "./utils/load-env";
import { recipientFeeKopForIncomingTx } from "../lib/payment/paygine-fee";

loadScriptsEnv();

const prisma = new PrismaClient();

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}
function getArg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : null;
}

function parseTipSplitPercent(payerInfo: string | null): number | null {
  if (!payerInfo) return null;
  try {
    const obj = JSON.parse(payerInfo) as { tipSplit?: { establishmentSharePercent?: unknown } };
    const p = Number(obj?.tipSplit?.establishmentSharePercent);
    if (Number.isFinite(p) && p > 0) return p;
  } catch {
    // ignore
  }
  return null;
}

function poolShareFromNet(net: bigint, percent: number): bigint {
  const p = Math.max(0, Math.min(100, percent));
  const bp = Math.round(p * 100);
  return (net * BigInt(bp)) / BigInt(10_000);
}

async function main(): Promise<void> {
  const runMode = hasFlag("--apply") ? "apply" : "dry-run";
  const userId = getArg("--user-id")?.trim() || null;

  const rows = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.SUCCESS,
      ...(userId ? { recipientId: userId } : {}),
    },
    select: {
      id: true,
      recipientId: true,
      amountKop: true,
      feeKop: true,
      paymentMethod: true,
      payerInfo: true,
      establishmentShareKop: true,
      recipientCreditedKop: true,
      recipientFeeChargedKop: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const prepared = rows.map((r) => {
    const fee = recipientFeeKopForIncomingTx({
      amountKop: r.amountKop,
      feeKop: r.feeKop,
      paymentMethod: r.paymentMethod === "sbp" ? "sbp" : "card",
      payerInfo: r.payerInfo,
    });
    const splitPercent = parseTipSplitPercent(r.payerInfo);
    const shareFromDb = r.establishmentShareKop ?? BigInt(0);
    const share =
      shareFromDb > BigInt(0)
        ? shareFromDb
        : splitPercent != null
          ? poolShareFromNet(r.amountKop - fee, splitPercent)
          : BigInt(0);
    const credited = r.amountKop - fee - share;
    const nextCredited = credited < BigInt(0) ? BigInt(0) : credited;
    const nextFee = fee < BigInt(0) ? BigInt(0) : fee;
    const changed =
      r.recipientCreditedKop !== nextCredited || r.recipientFeeChargedKop !== nextFee;
    return {
      id: r.id,
      changed,
      currentCredited: r.recipientCreditedKop,
      currentFee: r.recipientFeeChargedKop,
      nextCredited,
      nextFee,
    };
  });

  const updates = prepared.filter((p) => p.changed);
  console.log(
    JSON.stringify(
      {
        runMode,
        userId,
        totalRows: rows.length,
        updates: updates.length,
        sample: updates.slice(0, 10).map((u) => ({
          id: u.id,
          currentCredited: u.currentCredited?.toString() ?? null,
          currentFee: u.currentFee?.toString() ?? null,
          nextCredited: u.nextCredited.toString(),
          nextFee: u.nextFee.toString(),
        })),
      },
      null,
      2,
    ),
  );

  if (runMode !== "apply" || updates.length === 0) return;

  for (const u of updates) {
    await prisma.transaction.update({
      where: { id: u.id },
      data: {
        recipientCreditedKop: u.nextCredited,
        recipientFeeChargedKop: u.nextFee,
      },
    });
  }

  console.log(JSON.stringify({ ok: true, updated: updates.length }, null, 2));
}

main()
  .catch((e) => {
    console.error("[backfill-transaction-relocate-facts] failed:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
