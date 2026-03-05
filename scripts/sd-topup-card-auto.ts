/**
 * Автопополнение кубышки картой: Register → форма SDPayIn → браузер заполняет форму на Paygine.
 * Playwright открывает страницу Paygine и подставляет данные карты (как будто вводит пользователь).
 * Запрос по-прежнему идёт из браузера в Paygine — мы только «транслируем» ввод.
 *
 * Только для тестовой карты на тестовом стенде. Данные карты — из scripts/.env.
 *
 * Запуск:
 *   npx tsx scripts/sd-topup-card-auto.ts <pay_page_url> [amount_kop]
 *     — открыть страницу оплаты, нажать «Оплатить картой», на Paygine заполнить карту.
 *   npx tsx scripts/sd-topup-card-auto.ts <amount_kop>
 *     — Register и сразу оплата картой (авто).
 *   npx tsx scripts/sd-topup-card-auto.ts <orderId> <amount_kop>
 *     — оплатить уже зарегистрированную заявку.
 *
 * HEADLESS=1 (или не задано) — браузер скрыт. HEADLESS=0 — показать браузер при отладке.
 *
 * В scripts/.env задать (тестовая карта от Paygine):
 *   PAYGINE_TEST_PAN= номер карты без пробелов
 *   PAYGINE_TEST_EXPIRY= MM/YY или MMYY
 *   PAYGINE_TEST_CVC= 3–4 цифры
 *
 * Если форма Paygine изменится (другие id/name полей), в скрипте подправить селекторы (см. CARD_SELECTORS).
 */

import { loadScriptsEnv } from "./utils/load-env";
import { saveLastTopup } from "./utils/last-topup";
import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { chromium } from "playwright";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const SDPAYIN_PATH = "/webapi/b2puser/sd-services/SDPayIn";
const SDRELOCATE_PATH = "/webapi/b2puser/sd-services/SDRelocateFunds";
const CURRENCY_RUB = 643;
const RELOCATE_DELAY_MS = 3_000;
const CURRENCY_STR = "643";
const DEFAULT_TIMEOUT_MS = 30_000;
const PAGE_WAIT_MS = 15_000;
const CARD_SUBMIT_WAIT_MS = 60_000;

// Селекторы полей на странице Paygine (data-testid / data-field / name из DOM формы).
const CARD_SELECTORS = {
  pan: [
    'input[data-testid="card:field-pan-input"]', 'input[data-field="pan-input"]', 'input[name="pan"]',
    'input[data-testid="card:field-number-input"]', 'input[data-field="number-input"]', 'input[name="cardNumber"]',
    'input[name="card_number"]', 'input[id="pan"]', 'input[autocomplete="cc-number"]',
    'input[placeholder*="номер"]', 'input[placeholder*="карт"]', 'input[placeholder*="Card"]',
  ],
  expdate: [
    'input[data-testid="card:field-date-input"]', 'input[data-field="date-input"]', 'input[name="date"]',
    'input[name="expdate"]', 'input[name="exp"]', 'input[name="expiry"]', 'input[name="expire"]',
    'input[autocomplete="cc-exp"]', 'input[placeholder*="срок"]', 'input[placeholder*="MM"]',
    'input[placeholder*="MM/YY"]', 'input[name="mm"]', 'input[name="yy"]',
  ],
  cvc: [
    'input[data-testid="card:field-code-input"]', 'input[data-field="code-input"]', 'input[name="code"]',
    'input[name="cvc"]', 'input[name="cvv"]', 'input[name="cvc2"]', 'input[autocomplete="cc-csc"]',
    'input[placeholder*="CVC"]', 'input[placeholder*="CVV"]', 'input[placeholder*="код"]',
  ],
};


function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type FrameLike = import("playwright").Page | import("playwright").Frame;

async function findAndFillInFrame(frame: FrameLike, kind: "pan" | "expdate" | "cvc", value: string): Promise<boolean> {
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

/** Ищем поля карты на странице и во всех iframe (форма Paygine может быть в iframe). */
async function findAndFill(page: import("playwright").Page, kind: "pan" | "expdate" | "cvc", value: string): Promise<boolean> {
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

async function main(): Promise<void> {
  const arg1 = process.argv[2]?.trim();
  const arg2 = process.argv[3]?.trim();

  const isPayPageUrl = arg1?.startsWith("http://") || arg1?.startsWith("https://");
  let payPageUrl: string | null = null;
  let orderId: string;
  let amountKop: number;

  if (isPayPageUrl && arg1) {
    payPageUrl = arg1;
    amountKop = arg2 ? parseInt(arg2, 10) : 10000; // по умолчанию 100 ₽
    orderId = `paypage-${Date.now()}`;
    if (!Number.isFinite(amountKop) || amountKop < 100) {
      console.error("amount_kop (второй аргумент) должно быть не меньше 100.");
      process.exit(1);
    }
  } else if (arg2) {
    orderId = arg1 ?? "";
    const amountArg = arg2;
    amountKop = parseInt(amountArg, 10);
    if (!orderId || !/^\d+$/.test(orderId)) {
      console.error("Usage: npx tsx scripts/sd-topup-card-auto.ts <orderId> <amount_kop>");
      console.error("  orderId — номер уже зарегистрированной заявки (из вывода sd-register / sd-topup-card).");
      process.exit(1);
    }
  } else if (arg1) {
    amountKop = parseInt(arg1, 10);
    orderId = ""; // будет получен из Register
  } else {
    console.error("Usage: npx tsx scripts/sd-topup-card-auto.ts <pay_page_url> [amount_kop]");
    console.error("       npx tsx scripts/sd-topup-card-auto.ts <amount_kop>");
    console.error("       npx tsx scripts/sd-topup-card-auto.ts <orderId> <amount_kop>");
    console.error("  В scripts/.env задать PAYGINE_TEST_PAN, PAYGINE_TEST_EXPIRY, PAYGINE_TEST_CVC.");
    process.exit(1);
  }

  if (!isPayPageUrl && (!Number.isFinite(amountKop) || amountKop <= 0)) {
    console.error("amount_kop должно быть положительным числом.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRef = process.env.PAYGINE_SD_REF?.trim();
  const successUrl = process.env.REGISTER_URL?.trim() || "https://example.com/pay/success";
  const failUrl = process.env.REGISTER_FAILURL?.trim() || "https://example.com/pay/fail";

  const pan = process.env.PAYGINE_TEST_PAN?.replace(/\s/g, "") ?? "";
  let expdate = process.env.PAYGINE_TEST_EXPIRY?.trim() ?? "";
  const cvc = process.env.PAYGINE_TEST_CVC?.trim() ?? "";

  const missing: string[] = [];
  if (!pan || pan.length < 8) missing.push("PAYGINE_TEST_PAN (номер тестовой карты)");
  if (!expdate) missing.push("PAYGINE_TEST_EXPIRY (MM/YY или MMYY)");
  if (!cvc) missing.push("PAYGINE_TEST_CVC");
  if (!payPageUrl) {
    if (!baseUrl) missing.push("PAYGINE_BASE_URL");
    if (!sector) missing.push("PAYGINE_SECTOR");
    if (!password) missing.push("PAYGINE_PASSWORD");
    if (!sdRef) missing.push("PAYGINE_SD_REF");
  }
  if (missing.length > 0) {
    console.error("Не задано в scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  if (expdate.length === 4 && !expdate.includes("/")) {
    expdate = `${expdate.slice(0, 2)}/${expdate.slice(2)}`;
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;
  const targetSdRef = sdRef as string; // целевая кубышка (итог после Relocate)
  let tempSdRef: string | null = null; // временная, только если заказ создаём мы (тогда после оплаты делаем Relocate)

  if (!payPageUrl && !orderId) {
    tempSdRef = `1tips_t_${crypto.randomUUID().replace(/-/g, "")}`;
    const reference = `topup-auto-${Date.now()}`;
    const regSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
    const regBody = new URLSearchParams({
      sector: sectorStr,
      amount: String(amountKop),
      currency: String(CURRENCY_RUB),
      reference,
      description: `Пополнение ${targetSdRef}`.slice(0, 1000),
      url: successUrl,
      failurl: failUrl,
      signature: regSignature,
      mode: "1",
      sd_ref: tempSdRef,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    let res: Response;
    let text: string;
    try {
      res = await fetch(`${baseUrlStr}${REGISTER_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: regBody.toString(),
        signal: controller.signal,
      });
      text = await res.text();
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(err);
      process.exit(1);
    }
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error("Register HTTP", res.status, text);
      process.exit(1);
    }

    const orderIdMatch = text.trim().match(/^\d+$/) || text.match(/<id>(\d+)<\/id>/);
    if (!orderIdMatch) {
      console.error("Register: неверный ответ", text.slice(0, 300));
      process.exit(1);
    }
    orderId = orderIdMatch[1] ?? text.trim();
  }

  const outDir = join(process.cwd(), "scripts", "out");
  mkdirSync(outDir, { recursive: true });

  const paySdRef = tempSdRef ?? targetSdRef; // в форме тот же sd_ref, что в Register (временная или целевая)
  if (!payPageUrl) {
    // HTML формы SDPayIn
    const paySignature = computeSignature(
      [sectorStr, orderId, String(amountKop), CURRENCY_STR, paySdRef],
      passwordStr,
    );
    const action = `${baseUrlStr}${SDPAYIN_PATH}`;
    const fields: Array<[string, string]> = [
      ["sector", sectorStr],
      ["id", orderId],
      ["amount", String(amountKop)],
      ["currency", CURRENCY_STR],
      ["sd_ref", paySdRef],
      ["url", successUrl],
      ["failurl", failUrl],
      ["signature", paySignature],
    ];
    const formInputs = fields
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
      .join("\n    ");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<form id="f" method="post" action="${escapeHtml(action)}">${formInputs}<button type="submit">Go</button></form>
</body></html>`;

    const outPath = join(outDir, `pay-auto-${orderId}.html`);
    writeFileSync(outPath, html, "utf8");
  }

  // Playwright: открыть страницу → попасть на Paygine → заполнить карту
  const headlessRaw = process.env.HEADLESS?.trim().split(/\s/)[0];
  const headless = headlessRaw === "0" || headlessRaw === "false" ? false : true;
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    if (payPageUrl) {
      await page.goto(payPageUrl, { waitUntil: "domcontentloaded", timeout: PAGE_WAIT_MS });
      if (amountKop !== 10000) {
        const customInput = page.getByLabel(/Своя сумма|своя сумма/i).or(page.locator('input[placeholder="100"]'));
        await customInput.first().fill(String(amountKop / 100));
      }
      await page.getByRole("button", { name: /Оплатить картой/i }).click();
      await page.waitForURL((url) => url.href.toLowerCase().includes("paygine"), { timeout: PAGE_WAIT_MS }).catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      const outPath = join(outDir, `pay-auto-${orderId}.html`);
      await page.goto(`file://${outPath}`, { waitUntil: "domcontentloaded" });
      await page.locator("#f").evaluate((form: HTMLFormElement) => form.submit());
      await page.waitForURL((url) => url.origin !== "null", { timeout: PAGE_WAIT_MS }).catch(() => {});

      const currentUrl = page.url();
      if (!currentUrl.includes("paygine") && !currentUrl.includes("example.com")) {
        await page.waitForTimeout(3000);
      }
    }

    const discover = process.env.DISCOVER?.trim() === "1";
    if (discover) {
      const formInfo = await page.evaluate(() => {
        const form = document.querySelector("form");
        if (!form) return null;
        const inputs = Array.from(form.querySelectorAll("input")).map((i) => ({
          name: i.name,
          type: i.type,
          hidden: i.type === "hidden",
        }));
        return { action: (form as HTMLFormElement).action, method: (form as HTMLFormElement).method, inputs };
      });
      console.log(JSON.stringify({ form: formInfo, hint: "POST на form.action с полями form.inputs (name). Для прямого запроса без браузера используйте sd-topup-card-direct.ts" }, null, 2));
      await browser.close();
      return;
    }

    const filledPan = await findAndFill(page, "pan", pan);
    const filledExp = await findAndFill(page, "expdate", expdate);
    const filledCvc = await findAndFill(page, "cvc", cvc);

    if (!filledPan || !filledExp || !filledCvc) {
      console.error("Не удалось найти поля карты на странице Paygine. Откройте с HEADLESS=0 и проверьте селекторы в скрипте (CARD_SELECTORS).");
      await page.screenshot({ path: join(outDir, `paygine-form-${orderId}.png`) });
      console.error("Скриншот сохранён: scripts/out/paygine-form-" + orderId + ".png");
      await browser.close();
      process.exit(1);
    }

    await page.waitForTimeout(500);
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], [type="submit"]').first();
    await submitBtn.click().catch(() => {
      page.locator("form").first().evaluate((f: HTMLFormElement) => f.submit());
    });

    await page.waitForURL((url) => url.href.includes("success") || url.href.includes("fail") || url.href.includes("example.com"), {
      timeout: CARD_SUBMIT_WAIT_MS,
    }).catch(() => {});

    const finalUrl = page.url();
    const ok = finalUrl.includes("success") || (finalUrl.includes("example.com") && !finalUrl.includes("fail"));
    if (ok) {
      saveLastTopup({
        pan: pan.replace(/\s/g, ""),
        amountKop,
        orderId,
        timestamp: new Date().toISOString(),
      });
      console.error("Пополнение выполнено.");
      console.error("  orderId:", orderId);

      if (tempSdRef && targetSdRef) {
        console.error("  Перенос с временной кубышки на целевую...");
        await new Promise((r) => setTimeout(r, RELOCATE_DELAY_MS));
        const relSig = computeSignature([sectorStr, orderId, tempSdRef, targetSdRef], passwordStr);
        const relBody = new URLSearchParams({
          sector: sectorStr,
          id: orderId,
          from_sd_ref: tempSdRef,
          to_sd_ref: targetSdRef,
          signature: relSig,
        });
        const relRes = await fetch(`${baseUrlStr}${SDRELOCATE_PATH}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: relBody.toString(),
        });
        const relText = await relRes.text();
        const relCode = relText.match(/<code>(\d+)<\/code>/)?.[1];
        if (relRes.ok && !relCode) {
          console.error("  SDRelocateFunds: средства на кубышке", targetSdRef);
        } else {
          console.error("  SDRelocateFunds: ошибка ПЦ", relCode ?? relText.slice(0, 150));
        }
        console.error("  sd_ref (целевая):", targetSdRef);
        console.error("  Для ручного перевода: npx tsx scripts/utils/sd-relocate.ts", orderId, tempSdRef, "<to_sd_ref>");
      } else if (targetSdRef) {
        console.error("  sd_ref:", targetSdRef);
        console.error("  Для перевода: npx tsx scripts/utils/sd-relocate.ts", orderId, targetSdRef, "<to_sd_ref>");
      }
    }
    console.log(JSON.stringify({
      ok: !!ok,
      orderId,
      sdRef: targetSdRef || undefined,
      amountKop,
      finalUrl: finalUrl.slice(0, 80),
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main();
