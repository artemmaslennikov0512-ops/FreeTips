/**
 * Полноценный E2E-нагрузочный тест: реальная оплата картой и перелив.
 * Цепочка: страница /pay/{slug} → «Оплатить» → форма Paygine → ввод карты → оплата
 * → вебхук Paygine → приложение делает перелив (SDRelocateFunds) на кубышку официанта.
 * По итогу проверяется по БД: сколько транзакций в SUCCESS (перелив выполнен), сколько ещё PENDING.
 *
 * Требуется:
 * - Приложение поднято (NEXT_PUBLIC_APP_URL или BASE_URL), вебхуки должны доходить до приложения
 * - DATABASE_URL, PAYGINE_* (тест Paygine)
 * - scripts/.env: PAYGINE_TEST_PAN, PAYGINE_TEST_EXPIRY, PAYGINE_TEST_CVC
 *
 * Запуск:
 *   npx tsx scripts/load-test-payments-e2e.ts [число_платежей] [параллельных_потоков]
 * По умолчанию: 20 платежей, 1 поток. Параллельных потоков 2–5 — нагрузка на сайт выше.
 * HEADLESS=0 — показать браузер.
 */

import "dotenv/config";
import { loadScriptsEnv } from "./utils/load-env";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { getWaiterPaygineSdRef } from "../lib/payment/paygine-sd-ref";
import { chromium } from "playwright";

loadScriptsEnv();

const prisma = new PrismaClient();

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  process.env.BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const E2E_SLUG = "test-waiter-e2e";
const TEST_PASSWORD = "TestPassword123!";
const PAGE_WAIT_MS = 20_000;
const CARD_SUBMIT_WAIT_MS = 70_000;
const RELOCATE_POLL_MS = 90_000; // сколько ждать переливов по БД после последнего платежа
const RELOCATE_POLL_INTERVAL_MS = 2_000;

const CARD_SELECTORS = {
  pan: [
    'input[data-testid="card:field-pan-input"]',
    'input[data-field="pan-input"]',
    'input[name="pan"]',
    'input[name="cardNumber"]',
    'input[name="card_number"]',
    'input[id="pan"]',
    'input[autocomplete="cc-number"]',
    'input[placeholder*="номер"]',
    'input[placeholder*="Card"]',
  ],
  expdate: [
    'input[data-testid="card:field-date-input"]',
    'input[data-field="date-input"]',
    'input[name="date"]',
    'input[name="expdate"]',
    'input[name="expiry"]',
    'input[autocomplete="cc-exp"]',
    'input[placeholder*="MM"]',
  ],
  cvc: [
    'input[data-testid="card:field-code-input"]',
    'input[data-field="code-input"]',
    'input[name="code"]',
    'input[name="cvc"]',
    'input[name="cvv"]',
    'input[autocomplete="cc-csc"]',
    'input[placeholder*="CVC"]',
  ],
};

type FrameLike = import("playwright").Page | import("playwright").Frame;

async function findAndFillInFrame(
  frame: FrameLike,
  kind: "pan" | "expdate" | "cvc",
  value: string
): Promise<boolean> {
  const selectors = CARD_SELECTORS[kind];
  for (const sel of selectors) {
    try {
      const el = frame.locator(sel).first();
      await el.waitFor({ state: "visible", timeout: 2000 });
      await el.fill(value);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function findAndFill(
  page: import("playwright").Page,
  kind: "pan" | "expdate" | "cvc",
  value: string
): Promise<boolean> {
  if (await findAndFillInFrame(page, kind, value)) return true;
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      if (await findAndFillInFrame(frame, kind, value)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

async function runOnePayment(
  page: import("playwright").Page,
  slug: string,
  pan: string,
  expdate: string,
  cvc: string
): Promise<{ ok: boolean; error?: string }> {
  const payUrl = `${BASE_URL}/pay/${slug}`;
  await page.goto(payUrl, { waitUntil: "domcontentloaded", timeout: PAGE_WAIT_MS });

  // Убираем баннер «Уведомление об использовании cookies», чтобы он не перехватывал клики
  await page.evaluate(() => localStorage.setItem("cookieConsentAccepted", "1"));
  await page.reload({ waitUntil: "domcontentloaded" });

  const payBtn = page.getByRole("button", { name: /Оплатить/i });
  await payBtn.waitFor({ state: "visible", timeout: 8000 });
  await payBtn.click();

  await page.waitForURL(
    (url) => url.pathname.includes("/pay/redirect") && url.searchParams.has("tid"),
    { timeout: PAGE_WAIT_MS }
  ).catch(() => {});

  await page.waitForURL(
    (url) => /paygine|pay\.paygine/i.test(url.href),
    { timeout: PAGE_WAIT_MS }
  ).catch(() => {});

  if (!/paygine|pay\.paygine/i.test(page.url())) {
    return { ok: false, error: "Не попали на форму Paygine" };
  }

  const filledPan = await findAndFill(page, "pan", pan);
  const filledExp = await findAndFill(page, "expdate", expdate);
  const filledCvc = await findAndFill(page, "cvc", cvc);

  if (!filledPan || !filledExp || !filledCvc) {
    return { ok: false, error: "Не найдены поля карты на форме Paygine" };
  }

  await page.waitForTimeout(500);
  const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
  await submitBtn.click().catch(() => {
    page.locator("form").first().evaluate((f: HTMLFormElement) => f.submit());
  });

  const success = await page
    .waitForURL(
      (url) =>
        (url.pathname.includes("/pay/result") && url.searchParams.get("outcome") === "success") ||
        url.href.includes("success"),
      { timeout: CARD_SUBMIT_WAIT_MS }
    )
    .then(() => true)
    .catch(() => false);

  return { ok: success };
}

// Тестовые карты Paygine (тестовый стенд). Переопределяются через PAYGINE_TEST_* в scripts/.env.
const DEFAULT_TEST_PAN = "2200019999000007";
const DEFAULT_TEST_EXPIRY = "08/25";
const DEFAULT_TEST_CVC = "983";

async function main() {
  const countArg = process.argv[2]?.trim();
  const numPayments = countArg ? Math.max(1, parseInt(countArg, 10) || 20) : 20;

  const pan = (process.env.PAYGINE_TEST_PAN?.replace(/\s/g, "") ?? DEFAULT_TEST_PAN).trim();
  let expdate = process.env.PAYGINE_TEST_EXPIRY?.trim() ?? DEFAULT_TEST_EXPIRY;
  const cvc = (process.env.PAYGINE_TEST_CVC?.trim() ?? DEFAULT_TEST_CVC).trim();

  if (!pan || pan.length < 8) {
    console.error("Задайте PAYGINE_TEST_PAN в scripts/.env или используйте тестовую карту по умолчанию.");
    process.exit(1);
  }
  if (!cvc) {
    console.error("Задайте PAYGINE_TEST_CVC в scripts/.env.");
    process.exit(1);
  }
  if (expdate.length === 4 && !expdate.includes("/")) {
    expdate = `${expdate.slice(0, 2)}/${expdate.slice(2)}`;
  }

  console.log("1. Подготовка тестового пользователя и ссылки…");
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const slug = E2E_SLUG;

  let linkId: string;
  const existingLink = await prisma.tipLink.findFirst({
    where: { slug: E2E_SLUG },
    select: { id: true },
  });

  if (existingLink) {
    linkId = existingLink.id;
    console.log("   Используется существующая ссылка:", E2E_SLUG);
  } else {
    const user = await prisma.user.create({
      data: {
        login: `e2e-waiter-${Date.now()}`,
        email: "e2e-waiter@test.local",
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
      data: { userId: user.id, slug: E2E_SLUG },
    });
    linkId = tipLink.id;
    console.log("   Создан пользователь и ссылка:", E2E_SLUG);
  }

  const concurrentArg = process.argv[3]?.trim();
  const concurrent = concurrentArg ? Math.max(1, Math.min(10, parseInt(concurrentArg, 10) || 1)) : 1;
  const paymentsPerWorker = Math.ceil(numPayments / concurrent);

  console.log(
    `2. E2E под нагрузкой: ${numPayments} оплат, ${concurrent} поток(ов) (страница → Paygine → карта → вебхук → перелив)…`
  );
  const headless = process.env.HEADLESS?.trim() !== "0" && process.env.HEADLESS?.trim() !== "false";
  const browser = await chromium.launch({ headless });
  const startTime = new Date();

  const results: { ok: boolean; error?: string }[] = [];
  const runWorker = async (workerIndex: number) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const myCount = workerIndex === concurrent - 1 ? numPayments - (concurrent - 1) * paymentsPerWorker : paymentsPerWorker;
    for (let i = 0; i < myCount; i++) {
      const r = await runOnePayment(page, slug, pan, expdate, cvc);
      results.push(r);
      if (concurrent === 1) {
        console.log(r.ok ? `   Платёж ${results.length}/${numPayments}: успех` : `   Платёж ${results.length}/${numPayments}: ${r.error ?? "ошибка"}`);
      }
      if (i < myCount - 1) await page.waitForTimeout(1200);
    }
    await context.close();
  };

  try {
    await Promise.all(Array.from({ length: concurrent }, (_, i) => runWorker(i)));
  } finally {
    await browser.close();
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  console.log("\n3. Итог оплат: успешно %s, с ошибкой %s.", okCount, failCount);

  async function getTxStats(since: Date) {
    const list = await prisma.transaction.findMany({
      where: { linkId, createdAt: { gte: since } },
      select: { id: true, status: true },
    });
    const byStatus = { SUCCESS: 0, PENDING: 0, FAILED: 0, other: 0 };
    for (const t of list) {
      if (t.status === "SUCCESS") byStatus.SUCCESS++;
      else if (t.status === "PENDING") byStatus.PENDING++;
      else if (t.status === "FAILED") byStatus.FAILED++;
      else byStatus.other++;
    }
    return { total: list.length, ...byStatus };
  }

  console.log("4. Проверка перелива по БД (транзакции по ссылке за сессию)…");
  let stats = await getTxStats(startTime);
  const deadline = Date.now() + RELOCATE_POLL_MS;
  while (stats.PENDING > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, RELOCATE_POLL_INTERVAL_MS));
    stats = await getTxStats(startTime);
  }
  console.log(
    "   SUCCESS (перелив выполнен): %s, PENDING: %s, FAILED: %s, прочие: %s, всего по ссылке за сессию: %s",
    stats.SUCCESS,
    stats.PENDING,
    stats.FAILED,
    stats.other,
    stats.total
  );
  console.log("Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
