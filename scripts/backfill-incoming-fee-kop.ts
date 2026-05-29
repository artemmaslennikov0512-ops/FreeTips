/**
 * Backfill feeKop для входящих чаевых, где комиссия списывается с получателя
 * (payerInfo.paygineFeePayer = "recipient"), но feeKop в БД пустой или 0.
 *
 * Запуск:
 *   npx tsx scripts/backfill-incoming-fee-kop.ts --dry-run
 *   npx tsx scripts/backfill-incoming-fee-kop.ts --apply
 *
 * По умолчанию запускается dry-run.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { loadScriptsEnv } from "./utils/load-env";
import { feeKopForIncoming } from "../lib/payment/paygine-fee";

loadScriptsEnv();

const prisma = new PrismaClient();

type CandidateRow = {
  id: string;
  amountKop: bigint;
  paymentMethod: string | null;
};

function parseMode(argv: string[]): "dry-run" | "apply" {
  if (argv.includes("--apply")) return "apply";
  return "dry-run";
}

function calcFeeKop(amountKop: bigint, paymentMethod: string | null): bigint {
  const amountNum = Number(amountKop);
  const method = paymentMethod === "sbp" ? "sbp" : "card";
  return BigInt(feeKopForIncoming(amountNum, method));
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));

  const candidates = await prisma.transaction.findMany({
    where: {
      status: { in: ["PENDING", "SUCCESS"] },
      payerInfo: { contains: "\"paygineFeePayer\":\"recipient\"" },
      OR: [{ feeKop: null }, { feeKop: { lte: BigInt(0) } }],
    },
    select: {
      id: true,
      amountKop: true,
      paymentMethod: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let totalFeeKop = BigInt(0);
  for (const row of candidates as CandidateRow[]) {
    totalFeeKop += calcFeeKop(row.amountKop, row.paymentMethod);
  }

  console.log(
    JSON.stringify(
      {
        mode,
        candidatesCount: candidates.length,
        totalBackfilledFeeKop: totalFeeKop.toString(),
        totalBackfilledFeeRub: (Number(totalFeeKop) / 100).toFixed(2),
      },
      null,
      2,
    ),
  );

  if (mode !== "apply" || candidates.length === 0) return;

  await prisma.$transaction(
    candidates.map((row) =>
      prisma.transaction.update({
        where: { id: row.id },
        data: {
          feeKop: calcFeeKop(row.amountKop, row.paymentMethod),
        },
      }),
    ),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        updatedCount: candidates.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("[backfill-incoming-fee-kop] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
