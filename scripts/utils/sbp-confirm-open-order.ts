/**
 * Подтверждает оплату по СБП для открытого в браузере заказа.
 * Вызывает test/SBPTestCase → Paygine помечает заказ оплаченным. Обновите страницу (F5) — должно показать успех.
 *
 * Запуск из корня проекта:
 *   npx tsx scripts/utils/sbp-confirm-open-order.ts [amountKop]
 *     — по БД: последняя PENDING (или с суммой amountKop в копейках).
 *   npx tsx scripts/utils/sbp-confirm-open-order.ts --order-id <orderId>
 *     — по orderId из URL страницы Paygine (посмотрите адресную строку на странице оплаты, параметр id или order_id).
 *
 * Требуется: для поиска по БД — .env (DATABASE_URL); scripts/.env (PAYGINE_*).
 */

import "dotenv/config";
import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

loadScriptsEnv();

const prisma = new PrismaClient();
const DEFAULT_CASE_ID = "150";
const SBP_TEST_PATH = process.env.PAYGINE_SBP_TEST_PATH?.trim() || "test/SBPTestCase";

function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const orderIdArgIndex = args.findIndex((a) => a === "--order-id");
  let orderId: string | null = null;
  let amountKopLog = 0;

  if (orderIdArgIndex >= 0 && args[orderIdArgIndex + 1]) {
    orderId = args[orderIdArgIndex + 1].trim();
  }

  if (!orderId) {
    const amountArg = args[0]?.trim();
    const where: { status: string; amountKop?: bigint } = { status: "PENDING" };
    if (amountArg) {
      const amountKop = parseInt(amountArg, 10);
      if (!Number.isFinite(amountKop) || amountKop < 1) {
        console.error("amountKop должно быть положительным числом (например 20500 для 205 ₽).");
        console.error("Либо укажите --order-id <orderId> (orderId из URL страницы Paygine).");
        process.exit(1);
      }
      where.amountKop = BigInt(amountKop);
    }

    const tx = await prisma.transaction.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, externalId: true, amountKop: true },
    });

    if (!tx) {
      console.error("Нет подходящей PENDING транзакции в БД.", amountArg ? `Сумма ${amountArg} коп.` : "");
      console.error("Подсказка: откройте страницу Paygine с оплатой, посмотрите URL — там может быть id или order_id. Тогда: npx tsx scripts/utils/sbp-confirm-open-order.ts --order-id <число>");
      process.exit(1);
    }
    if (!tx.externalId) {
      console.error("У транзакции", tx.id, "нет externalId (заказ ещё не зарегистрирован в Paygine).");
      process.exit(1);
    }

    orderId = tx.externalId;
    amountKopLog = Number(tx.amountKop);
    console.error("Транзакция:", tx.id);
    console.error("Сумма:", amountKopLog, "коп.");
  }

  console.error("OrderId Paygine:", orderId);

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  if (!baseUrl || !sector || !password) {
    console.error("Задайте PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD в scripts/.env");
    process.exit(1);
  }

  const caseId = DEFAULT_CASE_ID;
  const qrcId = "";
  const tagValues = [sector, caseId, qrcId, orderId];
  const signature = computeSignature(tagValues, password);

  const query = new URLSearchParams({
    sector,
    case_id: caseId,
    order_id: orderId,
    mode: "1",
    signature,
  });
  const path = SBP_TEST_PATH.replace(/^\//, "");
  const url = `${baseUrl}/${path}?${query.toString()}`;
  console.error("SBPTestCase: GET", url.slice(0, 100) + "...");

  const res = await fetch(url, { method: "GET", redirect: "manual" });
  const text = await res.text();

  if (!res.ok) {
    console.error("SBPTestCase HTTP", res.status, text.slice(0, 300));
    process.exit(1);
  }

  console.error("Оплата подтверждена. Обновите страницу в браузере (F5) — должно показать успех.");
  console.log(JSON.stringify({ ok: true, orderId, amountKop: amountKopLog || null, response: text.slice(0, 200) }, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
