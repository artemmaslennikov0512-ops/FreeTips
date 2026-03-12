/**
 * Обработка «открытых» заявок, созданных нагрузочным тестом (load-test-payments.ts).
 * В БД остаются PENDING-транзакции с idempotencyKey вида loadtest-* — по ним в Paygine
 * заказ зарегистрирован, но оплата картой не проводилась.
 *
 * Режимы:
 * 1. По умолчанию: отправить вебхуки по всем таким PENDING в приложение.
 *    Приложение примет вебхук, попытается сделать перелив в Paygine; т.к. заказ не оплачен,
 *    перелив не пройдёт — заявки перейдут в FAILED (это «закрытие» с точки зрения обработки).
 *
 * 2. --mark-success: не слать вебхуки; обновить в БД status=SUCCESS для всех PENDING с
 *    idempotencyKey loadtest-*. Только для очистки тестовых данных (денег в Paygine не двигается).
 *
 * Запуск:
 *   npx tsx scripts/load-test-complete-pending.ts           # вебхуки → заявки станут FAILED
 *   npx tsx scripts/load-test-complete-pending.ts --mark-success   # пометить как SUCCESS в БД
 *
 * Требуется: DATABASE_URL; для режима вебхуков — BASE_URL/NEXT_PUBLIC_APP_URL, PAYGINE_PASSWORD.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { buildPaygineSignature } from "../lib/payment/paygine/signature";

const prisma = new PrismaClient();

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 500;

function buildWebhookXml(reference: string, password: string): string {
  const state = "APPROVED";
  const orderState = "COMPLETED";
  const tagValues = [reference, state, orderState];
  const signature = buildPaygineSignature(tagValues, password);
  return `<?xml version="1.0" encoding="UTF-8"?>
<response>
<reference>${reference}</reference>
<state>${state}</state>
<order_state>${orderState}</order_state>
<signature>${signature}</signature>
</response>`;
}

async function sendWebhook(idempotencyKey: string): Promise<boolean> {
  const password = process.env.PAYGINE_PASSWORD;
  if (!password) return false;
  const xml = buildWebhookXml(idempotencyKey, password);
  try {
    const res = await fetch(`${BASE_URL}/api/payment/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const markSuccess = process.argv.includes("--mark-success");

  const pending = await prisma.transaction.findMany({
    where: { status: "PENDING", idempotencyKey: { startsWith: "loadtest-" } },
    select: { id: true, idempotencyKey: true },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    console.log("Нет PENDING-заявок с idempotencyKey loadtest-*.");
    return;
  }

  console.log("Найдено PENDING заявок (loadtest-*): %s", pending.length);

  if (markSuccess) {
    const updated = await prisma.transaction.updateMany({
      where: { id: { in: pending.map((t) => t.id) } },
      data: { status: "SUCCESS" },
    });
    console.log("Помечено как SUCCESS в БД: %s (тестовая очистка, без вебхуков и Paygine).", updated.count);
    return;
  }

  const password = process.env.PAYGINE_PASSWORD;
  if (!password) {
    console.error("Для отправки вебхуков задайте PAYGINE_PASSWORD.");
    process.exit(1);
  }

  console.log("Отправка вебхуков в %s (батчами по %s)…", BASE_URL, BATCH_SIZE);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((t) => sendWebhook(t.idempotencyKey)));
    results.forEach((r) => (r ? ok++ : fail++));
    if (i + BATCH_SIZE < pending.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
    if ((i + batch.length) % 200 === 0 || i + batch.length === pending.length) {
      console.log("   обработано %s/%s", i + batch.length, pending.length);
    }
  }
  console.log("Готово. Вебхуков принято: %s, с ошибкой: %s.", ok, fail);
  console.log("Заявки перейдут в FAILED (перелив в Paygine не пройдёт — заказы не оплачены картой).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
