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
 *   npx tsx scripts/load-test-payments-e2e.ts batch     — лёгкий batch: 3 аккаунта, по 10 редиректов (сервер не перегружается).
 *   npx tsx scripts/load-test-payments-e2e.ts 10 batch  — 10 аккаунтов (можно 2–30). Редиректов на аккаунт и паузу между открытиями см. константы в скрипте.
 * По умолчанию: 50 платежей, 3 потока. HEADLESS=0 — показать браузер.
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
const PAGE_WAIT_MS = 25_000;
const CARD_SUBMIT_WAIT_MS = 75_000;
const RELOCATE_POLL_MS = 120_000;
const RELOCATE_POLL_INTERVAL_MS = 2_000;
const DELAY_BETWEEN_PAYMENTS_MS = 600;
const BATCH_FIRST_INTERVAL_MS = 1_000;
const BATCH_SECOND_INTERVAL_MS = 30_000;
const BATCH_FIRST_COUNT = 10;
const BATCH_REDIRECTS_PER_ACCOUNT = 10; // редиректов на аккаунт (20 — тяжёлая нагрузка, сервер может не потянуть)
const BATCH_OPEN_DELAY_MS = 400; // пауза между открытием каждой страницы в фазе 1 (снижает пиковую нагрузку)
const BATCH_ACCOUNTS_MIN = 2;
const BATCH_ACCOUNTS_MAX = 30;
const BATCH_ACCOUNTS_DEFAULT = 3; // по умолчанию 3 аккаунта (лёгкий режим для слабого сервера)

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

const PAY_BTN_WAIT_MS = 25_000;

/** Открывает страницу оплаты и доходит до формы Paygine (без ввода карты). */
async function openToPaygineForm(
  page: import("playwright").Page,
  slug: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payUrl = `${BASE_URL}/pay/${slug}`;
    await page.goto(payUrl, { waitUntil: "load", timeout: PAGE_WAIT_MS });
    await page.evaluate(() => localStorage.setItem("cookieConsentAccepted", "1"));
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(2000);

    const cookieDialog = page.getByRole("dialog", { name: /cookies/i });
    const dialogVisible = await cookieDialog.isVisible().catch(() => false);
    if (dialogVisible) {
      await page.getByRole("button", { name: /Понятно/i }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    const payBtn = page.getByRole("button", { name: /Оплатить/i });
    await payBtn.waitFor({ state: "visible", timeout: PAY_BTN_WAIT_MS });
    try {
      await payBtn.click({ timeout: 12_000 });
    } catch {
      await payBtn.click({ force: true, timeout: 5_000 }).catch(() => {});
    }

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
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.includes("Timeout") ? "Таймаут загрузки или кнопки" : msg.slice(0, 80) };
  }
}

/** Заполняет форму Paygine и отправляет (страница уже на Paygine). */
async function completePaygineForm(
  page: import("playwright").Page,
  pan: string,
  expdate: string,
  cvc: string
): Promise<{ ok: boolean; error?: string }> {
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

async function runOnePayment(
  page: import("playwright").Page,
  slug: string,
  pan: string,
  expdate: string,
  cvc: string
): Promise<{ ok: boolean; error?: string }> {
  const open = await openToPaygineForm(page, slug);
  if (!open.ok) return open;
  return completePaygineForm(page, pan, expdate, cvc);
}

// Тестовые карты Paygine (тестовый стенд). Переопределяются через PAYGINE_TEST_* в scripts/.env.
const DEFAULT_TEST_PAN = "2200019999000007";
const DEFAULT_TEST_EXPIRY = "08/25";
const DEFAULT_TEST_CVC = "983";

async function main() {
  const args = process.argv.slice(2).map((a) => a?.trim()).filter(Boolean);
  const batchMode = args.some((a) => a.toLowerCase() === "batch");
  const numArg = args.find((a) => /^\d+$/.test(a));
  const numAccountsBatch = batchMode && numArg
    ? Math.max(BATCH_ACCOUNTS_MIN, Math.min(BATCH_ACCOUNTS_MAX, parseInt(numArg, 10) || BATCH_ACCOUNTS_DEFAULT))
    : BATCH_ACCOUNTS_DEFAULT;
  const numPayments = batchMode
    ? numAccountsBatch * BATCH_REDIRECTS_PER_ACCOUNT
    : numArg ? Math.max(1, parseInt(numArg, 10) || 50) : 50;
  const concurrentArg = args.find((a, i) => i >= 1 && /^\d+$/.test(a));
  const concurrent = batchMode ? 1 : (concurrentArg ? Math.max(1, Math.min(10, parseInt(concurrentArg, 10) || 3)) : 3);

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

  const passwordHash = await hashPassword(TEST_PASSWORD);
  let slug: string;
  let linkId: string;
  let linkIds: string[] = [];
  let batchSlugs: string[] = [];

  if (batchMode) {
    console.log(`1. Подготовка ${numAccountsBatch} тестовых аккаунтов (по ${BATCH_REDIRECTS_PER_ACCOUNT} редиректов на аккаунт)…`);
    for (let a = 1; a <= numAccountsBatch; a++) {
      const accountSlug = `${E2E_SLUG}-${a}`;
      let tipLink = await prisma.tipLink.findFirst({
        where: { slug: accountSlug },
        select: { id: true },
      });
      if (!tipLink) {
        const user = await prisma.user.create({
          data: {
            login: `e2e-waiter-${a}-${Date.now()}`,
            email: `e2e-waiter-${a}@test.local`,
            passwordHash,
            role: "RECIPIENT",
            paygineSdRef: null,
          },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { paygineSdRef: getWaiterPaygineSdRef(user.id) },
        });
        tipLink = await prisma.tipLink.create({
          data: { userId: user.id, slug: accountSlug },
        });
      }
      batchSlugs.push(accountSlug);
      linkIds.push(tipLink!.id);
      if (a % 10 === 0 || a === numAccountsBatch) console.log(`   Готово аккаунтов: ${a}/${numAccountsBatch}`);
    }
    slug = batchSlugs[0]!;
  } else {
    console.log("1. Подготовка тестового пользователя и ссылки…");
    const existingLink = await prisma.tipLink.findFirst({
      where: { slug: E2E_SLUG },
      select: { id: true },
    });
    if (existingLink) {
      linkId = existingLink.id;
      linkIds = [existingLink.id];
      slug = E2E_SLUG;
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
      linkIds = [tipLink.id];
      slug = E2E_SLUG;
      console.log("   Создан пользователь и ссылка:", E2E_SLUG);
    }
  }

  const headless = process.env.HEADLESS?.trim() !== "0" && process.env.HEADLESS?.trim() !== "false";
  const browser = await chromium.launch({ headless });
  const startTime = new Date();
  const results: { ok: boolean; error?: string }[] = [];

  if (batchMode) {
    const total = numAccountsBatch * BATCH_REDIRECTS_PER_ACCOUNT;
    const firstCount = BATCH_FIRST_COUNT;
    const secondCount = BATCH_REDIRECTS_PER_ACCOUNT - BATCH_FIRST_COUNT;
    console.log(
      `2. Режим batch: ${numAccountsBatch} аккаунтов, по ${BATCH_REDIRECTS_PER_ACCOUNT} редиректов (всего ${total}). Открыть все, затем по каждому аккаунту: ${firstCount} оплат с интервалом 1 с, ${secondCount} с интервалом 30 с…`
    );
    const context = await browser.newContext();
    const pages: import("playwright").Page[] = [];
    for (let i = 0; i < total; i++) {
      pages.push(await context.newPage());
    }
    try {
      console.log("   Фаза 1: открытие всех редиректов на форму Paygine (пауза %s мс между страницами)…", BATCH_OPEN_DELAY_MS);
      for (let a = 0; a < numAccountsBatch; a++) {
        const accountSlug = batchSlugs[a]!;
        for (let j = 0; j < BATCH_REDIRECTS_PER_ACCOUNT; j++) {
          const idx = a * BATCH_REDIRECTS_PER_ACCOUNT + j;
          const r = await openToPaygineForm(pages[idx]!, accountSlug);
          if (!r.ok) results.push(r);
          else results.push({ ok: true });
          if (BATCH_OPEN_DELAY_MS > 0) await new Promise((r) => setTimeout(r, BATCH_OPEN_DELAY_MS));
        }
        if ((a + 1) % 5 === 0 || a + 1 === numAccountsBatch) {
          console.log(`   Аккаунтов открыто: ${a + 1}/${numAccountsBatch} (страниц ${(a + 1) * BATCH_REDIRECTS_PER_ACCOUNT}/${total})`);
        }
      }
      const openedOk = results.filter((r) => r.ok).length;
      if (openedOk < total) {
        console.log(`   На форму Paygine вышли ${openedOk}/${total}.`);
      }
      results.length = 0;

      console.log(`   Фаза 2: по каждому аккаунту первые ${firstCount} оплат с интервалом 1 с (параллельно по аккаунтам)…`);
      await Promise.all(
        Array.from({ length: numAccountsBatch }, async (_, a) => {
          for (let j = 0; j < firstCount; j++) {
            const idx = a * BATCH_REDIRECTS_PER_ACCOUNT + j;
            const r = await completePaygineForm(pages[idx]!, pan, expdate, cvc);
            results.push(r);
            if (j < firstCount - 1) await pages[idx]!.waitForTimeout(BATCH_FIRST_INTERVAL_MS);
          }
        })
      );

      console.log(`   Фаза 3: по каждому аккаунту остальные ${secondCount} оплат с интервалом 30 с…`);
      await Promise.all(
        Array.from({ length: numAccountsBatch }, async (_, a) => {
          for (let j = firstCount; j < BATCH_REDIRECTS_PER_ACCOUNT; j++) {
            const idx = a * BATCH_REDIRECTS_PER_ACCOUNT + j;
            const r = await completePaygineForm(pages[idx]!, pan, expdate, cvc);
            results.push(r);
            if (j < BATCH_REDIRECTS_PER_ACCOUNT - 1) await pages[idx]!.waitForTimeout(BATCH_SECOND_INTERVAL_MS);
          }
        })
      );

      for (const p of pages) await p.close().catch(() => {});
    } finally {
      await context.close();
      await browser.close();
    }
  } else {
    const paymentsPerWorker = Math.ceil(numPayments / concurrent);
    console.log(
      `2. E2E под нагрузкой: ${numPayments} оплат, ${concurrent} поток(ов) (страница → Paygine → карта → вебхук → перелив)…`
    );
    let completedCount = 0;
    const runWorker = async (workerIndex: number) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const myCount = workerIndex === concurrent - 1 ? numPayments - (concurrent - 1) * paymentsPerWorker : paymentsPerWorker;
      for (let i = 0; i < myCount; i++) {
        const r = await runOnePayment(page, slug, pan, expdate, cvc);
        results.push(r);
        completedCount += 1;
        if (concurrent === 1) {
          console.log(r.ok ? `   Платёж ${completedCount}/${numPayments}: успех` : `   Платёж ${completedCount}/${numPayments}: ${r.error ?? "ошибка"}`);
        } else if (completedCount % 10 === 0 || completedCount === numPayments) {
          const okSoFar = results.filter((x) => x.ok).length;
          console.log(`   Выполнено ${completedCount}/${numPayments}, успешно: ${okSoFar}`);
        }
        if (i < myCount - 1) await page.waitForTimeout(DELAY_BETWEEN_PAYMENTS_MS);
      }
      await context.close();
    };

    try {
      await Promise.all(Array.from({ length: concurrent }, (_, i) => runWorker(i)));
    } finally {
      await browser.close();
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  console.log("\n3. Итог оплат: успешно %s, с ошибкой %s.", okCount, failCount);

  async function getTxStats(since: Date) {
    const list = await prisma.transaction.findMany({
      where: { linkId: { in: linkIds }, createdAt: { gte: since } },
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

  console.log("4. Проверка перелива по БД (транзакции по ссылкам за сессию)…");
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
