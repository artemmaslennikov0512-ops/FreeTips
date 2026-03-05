/**
 * Ручной перелив на постоянную кубышку для одной транзакции (SUCCESS).
 * Используйте, если вебхук не смог выполнить SDRelocateFunds (например 133 или таймаут).
 *
 * Запуск из корня проекта:
 *   npx tsx scripts/utils/relocate-one-transaction.ts <transactionId>
 *   npx tsx scripts/utils/relocate-one-transaction.ts --external-id <paygineOrderId>
 *   npx tsx scripts/utils/relocate-one-transaction.ts --amount <amountKop>
 *     — последняя SUCCESS-транзакция с такой суммой (если externalId не пришёл в колбэке).
 *
 * При заданном PAYGINE_SD_REF_LEGAL и feeKop у транзакции: комиссия → ЮЛ, остаток → официант.
 * Требуется: .env (DATABASE_URL), scripts/.env (PAYGINE_*, опционально PAYGINE_SD_REF_LEGAL).
 */

import "dotenv/config";
import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

loadScriptsEnv();

const prisma = new PrismaClient();
const REGISTER_PATH = "/webapi/Register";
const SDRELOCATE_PATH = "/webapi/b2puser/sd-services/SDRelocateFunds";
const CURRENCY_RUB = 643;
const DELAY_MS = Number(process.env.PAYGINE_RELOCATE_DELAY_MS) || 3_000;
const RETRY_DELAY_MS = Number(process.env.PAYGINE_RELOCATE_RETRY_MS) || 8_000;

function sign(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const byExternalId = args[0] === "--external-id" && args[1];
  const byAmount = args[0] === "--amount" && args[1];
  const txId = !byExternalId && !byAmount ? args[0]?.trim() : null;
  const externalIdArg = byExternalId ? args[1].trim() : null;
  const amountArg = byAmount ? args[1].trim() : null;

  if (!txId && !byExternalId && !byAmount) {
    console.error("Usage: npx tsx scripts/utils/relocate-one-transaction.ts <transactionId>");
    console.error("       npx tsx scripts/utils/relocate-one-transaction.ts --external-id <paygineOrderId>");
    console.error("       npx tsx scripts/utils/relocate-one-transaction.ts --amount <amountKop>");
    process.exit(1);
  }

  let tx: {
    id: string;
    status: string;
    amountKop: bigint;
    feeKop: bigint | null;
    paymentMethod: string | null;
    paygineOrderSdRef: string | null;
    recipientId: string;
  } | null = null;

  if (byExternalId) {
    tx = await prisma.transaction.findFirst({
      where: { externalId: externalIdArg! },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  } else if (byAmount) {
    const amountKop = BigInt(amountArg!);
    if (amountKop < 1n) {
      console.error("Сумма в копейках должна быть положительной (211100 = 2111 ₽).");
      process.exit(1);
    }
    tx = await prisma.transaction.findFirst({
      where: { status: "SUCCESS", amountKop, paygineOrderSdRef: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  } else {
    tx = await prisma.transaction.findUnique({
      where: { id: txId! },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  }

  if (!tx) {
    const hint = byExternalId
      ? `externalId=${externalIdArg} (колбэк Paygine мог не прийти — попробуйте --amount <копейки>)`
      : byAmount
        ? `amountKop=${amountArg}`
        : `id=${txId}`;
    console.error("Транзакция не найдена.", hint);
    process.exit(1);
  }
  if (tx.status !== "SUCCESS") {
    console.error("Транзакция должна быть в статусе SUCCESS, сейчас:", tx.status);
    process.exit(1);
  }
  const orderSdRef = tx.paygineOrderSdRef?.trim();
  if (!orderSdRef) {
    console.error("У транзакции нет paygineOrderSdRef (кубышка заказа).");
    process.exit(1);
  }

  const recipient = await prisma.user.findUnique({
    where: { id: tx.recipientId },
    select: { paygineSdRef: true },
  });
  const waiterSdRef = recipient?.paygineSdRef?.trim();
  if (!waiterSdRef) {
    console.error("У получателя не задан paygineSdRef (кубышка официанта).");
    process.exit(1);
  }
  if (orderSdRef === waiterSdRef) {
    console.error("Кубышка заказа совпадает с кубышкой официанта — перелив не нужен.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  if (!baseUrl || !sector || !password) {
    console.error("Задайте PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD в scripts/.env");
    process.exit(1);
  }

  const isSbp = tx.paymentMethod === "sbp";
  const companySdRef = process.env.PAYGINE_SD_REF_LEGAL?.trim();
  const amountKopNum = Number(tx.amountKop);
  const feeKopNum = Number(tx.feeKop ?? 0);
  const toWaiterKop = isSbp && companySdRef && feeKopNum > 0 ? amountKopNum - feeKopNum : amountKopNum;

  const doOneRelocate = async (
    amount: number,
    toSdRef: string,
    desc: string
  ): Promise<{ ok: boolean; orderId?: string }> => {
    const ref = `relocate-${tx.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const regSig = sign([sector, String(amount), String(CURRENCY_RUB)], password);
    const regBody = new URLSearchParams({
      sector,
      amount: String(amount),
      currency: String(CURRENCY_RUB),
      reference: ref,
      description: desc.slice(0, 1000),
      url: "https://example.com/ok",
      failurl: "https://example.com/fail",
      signature: regSig,
      mode: "1",
    });
    const regRes = await fetch(`${baseUrl}${REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regBody.toString(),
    });
    const regText = await regRes.text();
    if (!regRes.ok) {
      console.error("Register HTTP", regRes.status, regText.slice(0, 300));
      return { ok: false };
    }
    const orderIdMatch = regText.trim().match(/^\d+$/) || regText.match(/<id>(\d+)<\/id>/);
    if (!orderIdMatch) {
      console.error("Register: неверный ответ", regText.slice(0, 300));
      return { ok: false };
    }
    const orderId = orderIdMatch[1] ?? regText.trim();
    const relSig = sign([sector, orderId, orderSdRef, toSdRef], password);
    const relBody = new URLSearchParams({
      sector,
      id: orderId,
      from_sd_ref: orderSdRef,
      to_sd_ref: toSdRef,
      signature: relSig,
    });
    let relRes = await fetch(`${baseUrl}${SDRELOCATE_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: relBody.toString(),
    });
    let relText = await relRes.text();
    if (relText.match(/<code>133<\/code>/)) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      relRes = await fetch(`${baseUrl}${SDRELOCATE_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: relBody.toString(),
      });
      relText = await relRes.text();
    }
    const ok =
      relText.includes("<state>APPROVED</state>") || relText.includes("<order_state>COMPLETED</order_state>");
    return ok ? { ok: true, orderId } : { ok: false };
  };

  console.error("Транзакция:", tx.id, "сумма:", amountKopNum, "коп.", feeKopNum > 0 ? `fee: ${feeKopNum} коп.` : "");
  if (isSbp && companySdRef && feeKopNum > 0) {
    console.error("СБП: комиссия", feeKopNum, "коп. → ЮЛ,", toWaiterKop, "коп. → официант");
  } else {
    console.error("С кубышки заказа:", orderSdRef, "→ официант:", waiterSdRef, toWaiterKop, "коп.");
  }
  console.error("Ожидание", DELAY_MS / 1000, "с перед Register...");
  await new Promise((r) => setTimeout(r, DELAY_MS));

  if (isSbp && companySdRef && feeKopNum > 0) {
    const rFee = await doOneRelocate(feeKopNum, companySdRef, `Комиссия ЮЛ (чаевые ${tx.id})`);
    if (!rFee.ok) {
      console.error("Ошибка перевода комиссии на ЮЛ.");
      process.exit(1);
    }
    console.error("Комиссия переведена на кубышку ЮЛ:", companySdRef);
  }

  if (toWaiterKop < 1) {
    console.error("Сумма официанту 0 (вся ушла в комиссию).");
    console.log(JSON.stringify({ ok: true, transactionId: tx.id, feeToLegalKop: feeKopNum }, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  }

  const rWaiter = await doOneRelocate(toWaiterKop, waiterSdRef, `Перевод чаевых → ${waiterSdRef}`);
  if (!rWaiter.ok) {
    console.error("Ошибка перевода на кубышку официанта.");
    process.exit(1);
  }
  console.error("Перелив выполнен успешно.");
  console.log(
    JSON.stringify(
      {
        ok: true,
        transactionId: tx.id,
        toSdRef: waiterSdRef,
        amountKop: toWaiterKop,
        ...(isSbp && companySdRef && feeKopNum > 0 ? { feeToLegalKop: feeKopNum } : {}),
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
