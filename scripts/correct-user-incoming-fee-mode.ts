/**
 * Точечная коррекция режима комиссии по входящим чаевым для одного ЛК (recipientId).
 *
 * Сценарий: в одном кабинете часть транзакций была в старом режиме (комиссия у плательщика),
 * часть — в новом (комиссия у получателя). Скрипт правит только выбранный диапазон дат.
 *
 * Примеры:
 *   npx tsx scripts/correct-user-incoming-fee-mode.ts --user-id <id> --from 2026-05-28T18:00:00Z --to 2026-05-29T00:00:00Z --mode recipient --dry-run
 *   npx tsx scripts/correct-user-incoming-fee-mode.ts --user-id <id> --from 2026-05-28T18:00:00Z --to 2026-05-29T00:00:00Z --mode recipient --apply
 *
 * Режимы:
 * - mode=recipient: комиссия считается от amount и записывается в feeKop, payerInfo.paygineFeePayer="recipient"
 * - mode=payer: комиссия для получателя отключается, feeKop сбрасывается в null, payerInfo.paygineFeePayer="payer"
 *
 * По умолчанию запускается dry-run.
 */

import "dotenv/config";
import { PrismaClient, TransactionStatus } from "@prisma/client";
import { loadScriptsEnv } from "./utils/load-env";
import { feeKopForIncoming } from "../lib/payment/paygine-fee";

loadScriptsEnv();

const prisma = new PrismaClient();

type CliMode = "recipient" | "payer";
type RunMode = "dry-run" | "apply";

type TxRow = {
  id: string;
  recipientId: string;
  amountKop: bigint;
  feeKop: bigint | null;
  paymentMethod: string | null;
  payerInfo: string | null;
  status: TransactionStatus;
  createdAt: Date;
};

function getArg(name: string): string | null {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseDateArg(name: string, required: boolean): Date | null {
  const raw = getArg(name);
  if (!raw) {
    if (required) throw new Error(`Missing required ${name}`);
    return null;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date in ${name}: ${raw}`);
  }
  return d;
}

function parseTxIdsArg(): string[] {
  const raw = getArg("--tx-ids");
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCliMode(): CliMode {
  const raw = (getArg("--mode") ?? "recipient").trim().toLowerCase();
  if (raw === "recipient" || raw === "payer") return raw;
  throw new Error(`Invalid --mode: ${raw}. Use recipient|payer`);
}

function parseRunMode(): RunMode {
  if (hasFlag("--apply")) return "apply";
  return "dry-run";
}

function parseStatuses(): TransactionStatus[] {
  const raw = (getArg("--statuses") ?? "SUCCESS,PENDING").trim();
  const allowed = new Set(["SUCCESS", "PENDING", "FAILED", "CANCELLED"]);
  const list = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const bad = list.filter((s) => !allowed.has(s));
  if (bad.length > 0) throw new Error(`Invalid --statuses: ${bad.join(", ")}`);
  return list as TransactionStatus[];
}

function parsePaymentMethodFilter(): "card" | "sbp" | "all" {
  const raw = (getArg("--payment-method") ?? "card").trim().toLowerCase();
  if (raw === "card" || raw === "sbp" || raw === "all") return raw;
  throw new Error(`Invalid --payment-method: ${raw}. Use card|sbp|all`);
}

function safeParsePayerInfo(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore invalid legacy json
  }
  return {};
}

function effectiveMethod(paymentMethod: string | null): "card" | "sbp" {
  return paymentMethod === "sbp" ? "sbp" : "card";
}

function calcTargetFeeKop(tx: TxRow, mode: CliMode): bigint | null {
  if (mode === "payer") return null;
  const method = effectiveMethod(tx.paymentMethod);
  const feeNum = feeKopForIncoming(Number(tx.amountKop), method);
  return BigInt(feeNum);
}

async function main(): Promise<void> {
  const userId = getArg("--user-id")?.trim();
  if (!userId) {
    throw new Error("Missing required --user-id");
  }
  const txIds = parseTxIdsArg();
  const from = parseDateArg("--from", txIds.length === 0)!;
  const to = parseDateArg("--to", false);
  const mode = parseCliMode();
  const runMode = parseRunMode();
  const statuses = parseStatuses();
  const methodFilter = parsePaymentMethodFilter();

  const txRows = await prisma.transaction.findMany({
    where: {
      recipientId: userId,
      ...(txIds.length > 0 ? { id: { in: txIds } } : {}),
      status: { in: statuses },
      ...(txIds.length === 0
        ? {
            createdAt: {
              gte: from,
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(methodFilter === "all" ? {} : { paymentMethod: methodFilter }),
    },
    select: {
      id: true,
      recipientId: true,
      amountKop: true,
      feeKop: true,
      paymentMethod: true,
      payerInfo: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const prepared = txRows.map((tx) => {
    const payload = safeParsePayerInfo(tx.payerInfo);
    const nextPayload = { ...payload, paygineFeePayer: mode };
    const nextFeeKop = calcTargetFeeKop(tx as TxRow, mode);
    const currentFee = tx.feeKop;
    const feeChanged =
      (currentFee == null && nextFeeKop != null) ||
      (currentFee != null && nextFeeKop == null) ||
      (currentFee != null && nextFeeKop != null && currentFee !== nextFeeKop);
    const currentMode = payload.paygineFeePayer;
    const modeChanged = currentMode !== mode;
    const shouldUpdate = feeChanged || modeChanged;
    return {
      tx,
      shouldUpdate,
      nextFeeKop,
      nextPayerInfo: JSON.stringify(nextPayload),
      currentMode,
    };
  });

  const updateCandidates = prepared.filter((p) => p.shouldUpdate);
  const totalAmountKop = txRows.reduce((acc, t) => acc + t.amountKop, BigInt(0));
  const totalFeeBeforeKop = txRows.reduce((acc, t) => acc + (t.feeKop ?? BigInt(0)), BigInt(0));
  const totalFeeAfterKop = prepared.reduce((acc, p) => acc + (p.nextFeeKop ?? BigInt(0)), BigInt(0));

  console.log(
    JSON.stringify(
      {
        runMode,
        mode,
        userId,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
        txIdsCount: txIds.length,
        statuses,
        paymentMethod: methodFilter,
        totalRows: txRows.length,
        updateCandidates: updateCandidates.length,
        totals: {
          amountKop: totalAmountKop.toString(),
          feeBeforeKop: totalFeeBeforeKop.toString(),
          feeAfterKop: totalFeeAfterKop.toString(),
          feeDeltaKop: (totalFeeAfterKop - totalFeeBeforeKop).toString(),
        },
        sample: prepared.slice(0, 10).map((p) => ({
          id: p.tx.id,
          createdAt: p.tx.createdAt.toISOString(),
          status: p.tx.status,
          paymentMethod: p.tx.paymentMethod,
          amountKop: p.tx.amountKop.toString(),
          currentFeeKop: p.tx.feeKop?.toString() ?? null,
          nextFeeKop: p.nextFeeKop?.toString() ?? null,
          currentMode: p.currentMode ?? null,
          nextMode: mode,
          shouldUpdate: p.shouldUpdate,
        })),
      },
      null,
      2,
    ),
  );

  if (runMode !== "apply" || updateCandidates.length === 0) return;

  for (const item of updateCandidates) {
    await prisma.transaction.update({
      where: { id: item.tx.id },
      data: {
        feeKop: item.nextFeeKop,
        payerInfo: item.nextPayerInfo,
        recipientFeeChargedKop: item.nextFeeKop,
        recipientCreditedKop:
          item.nextFeeKop != null
            ? item.tx.amountKop - item.nextFeeKop < BigInt(0)
              ? BigInt(0)
              : item.tx.amountKop - item.nextFeeKop
            : item.tx.amountKop,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updated: updateCandidates.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error("[correct-user-incoming-fee-mode] failed:", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
