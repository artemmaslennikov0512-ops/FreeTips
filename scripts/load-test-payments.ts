/**
 * Нагрузочный тест: 100 тестовых ЛК, по 20 заявок (пополнений) на аккаунт.
 * 10 заявок «оплачиваются» одновременно (вебхуки параллельно), остальные 10 — с интервалом 2 сек.
 *
 * Требуется:
 * - DATABASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD (тест Paygine)
 * - NEXT_PUBLIC_APP_URL или BASE_URL для вебхуков (например http://localhost:3000)
 *
 * Запуск: npx tsx scripts/load-test-payments.ts
 * Перед запуском поднимите приложение (чтобы вебхуки принимались).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { getWaiterPaygineSdRef } from "../lib/payment/paygine-sd-ref";
import { getPaymentGateway } from "../lib/payment/stub-gateway";
import { buildPaygineSignature } from "../lib/payment/paygine/signature";

const prisma = new PrismaClient();

const NUM_USERS = 100;
const PAYMENTS_PER_USER = 20;
const SIMULTANEOUS_WEBHOOKS = 10;
const DELAYED_WEBHOOKS = 10;
const WEBHOOK_DELAY_MS = 2000;
const TEST_PASSWORD = "TestPassword123!";
const AMOUNT_KOP = 10_000; // 100 ₽

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

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
  if (!password) {
    console.error("PAYGINE_PASSWORD не задан");
    return false;
  }
  const xml = buildWebhookXml(idempotencyKey, password);
  try {
    const res = await fetch(`${BASE_URL}/api/payment/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });
    return res.ok;
  } catch (e) {
    console.error("Webhook error:", e);
    return false;
  }
}

async function main() {
  console.log("1. Создание 100 тестовых пользователей и ссылок…");
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const created: { userId: string; slug: string; linkId: string }[] = [];

  for (let i = 1; i <= NUM_USERS; i++) {
    const login = `test-waiter-${i}`;
    const slug = `test-waiter-${i}`;
    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      let link = await prisma.tipLink.findFirst({
        where: { userId: existing.id },
        select: { id: true },
      });
      if (!link) {
        link = await prisma.tipLink.create({
          data: { userId: existing.id, slug },
        });
      }
      created.push({ userId: existing.id, slug, linkId: link.id });
      continue;
    }
    const user = await prisma.user.create({
      data: {
        login,
        email: `test-waiter-${i}@test.local`,
        passwordHash,
        role: "RECIPIENT",
        paygineSdRef: null,
      },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { paygineSdRef: getWaiterPaygineSdRef(user.id) },
    });
    const tipLink = await prisma.tipLink.create({
      data: { userId: user.id, slug },
    });
    created.push({ userId: user.id, slug, linkId: tipLink.id });
    if (i % 20 === 0) console.log(`   создано ${i} пользователей`);
  }

  console.log(`   Итого пользователей/ссылок: ${created.length}`);

  console.log("2. Создание по 20 заявок (платежей) на аккаунт…");
  const gateway = getPaymentGateway();
  const baseUrl = BASE_URL;
  const idempotencyKeysByUser: string[][] = [];

  for (let u = 0; u < created.length; u++) {
    const { userId, linkId } = created[u]!;
    const keys: string[] = [];
    for (let j = 0; j < PAYMENTS_PER_USER; j++) {
      const idempotencyKey = `loadtest-${userId}-${j}-${Date.now()}`;
      try {
        const result = await gateway.createPayment({
          linkId,
          recipientId: userId,
          amountKop: BigInt(AMOUNT_KOP),
          idempotencyKey,
          comment: null,
          baseUrl,
        });
        if (result.success) {
          keys.push(idempotencyKey);
        }
      } catch (e) {
        console.error(`   Ошибка createPayment user ${u + 1} payment ${j + 1}:`, e);
      }
    }
    idempotencyKeysByUser.push(keys);
    if ((u + 1) % 20 === 0) console.log(`   создано платежей у ${u + 1} пользователей`);
  }

  const totalPayments = idempotencyKeysByUser.reduce((s, arr) => s + arr.length, 0);
  console.log(`   Итого создано платежей: ${totalPayments}`);

  console.log("3. Отправка вебхуков: первые 10 одновременно, остальные 10 с интервалом 2 сек на каждого пользователя…");
  let okCount = 0;
  let failCount = 0;

  for (let u = 0; u < idempotencyKeysByUser.length; u++) {
    const keys = idempotencyKeysByUser[u]!;
    const firstBatch = keys.slice(0, SIMULTANEOUS_WEBHOOKS);
    const secondBatch = keys.slice(SIMULTANEOUS_WEBHOOKS, SIMULTANEOUS_WEBHOOKS + DELAYED_WEBHOOKS);

    const results1 = await Promise.all(firstBatch.map((key) => sendWebhook(key)));
    results1.forEach((r) => (r ? okCount++ : failCount++));

    for (const key of secondBatch) {
      await new Promise((r) => setTimeout(r, WEBHOOK_DELAY_MS));
      const ok = await sendWebhook(key);
      if (ok) okCount++;
      else failCount++;
    }

    if ((u + 1) % 20 === 0) console.log(`   обработано пользователей: ${u + 1}/${idempotencyKeysByUser.length}`);
  }

  console.log("Готово.");
  console.log(`   Вебхуков успешно: ${okCount}, с ошибкой: ${failCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
