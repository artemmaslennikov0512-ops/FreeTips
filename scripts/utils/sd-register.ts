/**
 * Пополнение кубышки: регистрация заказа (webapi/Register) и вывод ссылки на оплату.
 * Документация: апи.md, раздел «Сервис webapi/Register» (Таблица 25).
 * Подпись: sector, amount, currency, password (Приложение №2).
 * После успеха можно открыть ссылку на оплату (СБП или карта) или вызвать SDPayIn/SDPayInSBP с полученным order_id.
 *
 * Запуск: npx tsx scripts/utils/sd-register.ts <amount_kop> [reference]
 * Параметры и кубышка — из scripts/.env (PAYGINE_*, REGISTER_*, PAYGINE_SD_REF).
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const CURRENCY_RUB = 643;
const DEFAULT_TIMEOUT_MS = 30_000;

function computePaygineSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  const reference = process.argv[3]?.trim() || `script-${Date.now()}`;

  const amountKop = amountArg ? parseInt(amountArg, 10) : 0;
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("Usage: npx tsx scripts/utils/sd-register.ts <amount_kop> [reference]");
    console.error("  amount_kop — сумма пополнения в копейках.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRef = process.env.PAYGINE_SD_REF?.trim();

  const appUrl = process.env.REGISTER_APP_URL?.trim().replace(/\/$/, "");
  const url = process.env.REGISTER_URL?.trim() || (appUrl ? `${appUrl}/pay/success` : "https://example.com/pay/success");
  const failurl = process.env.REGISTER_FAILURL?.trim() || (appUrl ? `${appUrl}/pay/fail` : "https://example.com/pay/fail");
  const notifyUrl = process.env.REGISTER_NOTIFY_URL?.trim() || (appUrl ? `${appUrl}/api/v1/webhooks/paygine` : "");

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!sdRef) missing.push("PAYGINE_SD_REF");
  if (missing.length > 0) {
    console.error("Не задано в scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;
  const sdRefStr = sdRef as string;

  // Подпись по апи.md Таблица 25: sector, amount, currency, password
  const signature = computePaygineSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const body = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description: `Пополнение кубышки ${sdRefStr}`.slice(0, 1000),
    url,
    failurl,
    signature,
    mode: "1",
  });
  body.set("sd_ref", sdRefStr);
  if (notifyUrl) body.set("notify_url", notifyUrl);

  const fullUrl = `${baseUrlStr}${REGISTER_PATH}`;
  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(isAbort ? "Timeout" : err);
    process.exit(1);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  // mode=1 — ответ text/plain с id заказа (апи.md)
  const orderIdMatch = text.trim().match(/^\d+$/) || text.match(/<id>(\d+)<\/id>/);
  if (orderIdMatch) {
    const orderId = orderIdMatch[1] ?? text.trim();
    const payUrlCard = `${baseUrlStr}/webapi/b2puser/sd-services/SDPayIn`;
    const payUrlSbp = `${baseUrlStr}/webapi/b2puser/sd-services/SDPayInSBP`;
    console.log(JSON.stringify({
      ok: true,
      orderId,
      amountKop,
      sdRef: sdRefStr,
      payUrlCard: `${payUrlCard} (POST: sector, id=${orderId}, amount, currency, sd_ref, url, failurl, signature)`,
      payUrlSbp: `${payUrlSbp} (POST: sector, id=${orderId}, amount, currency, sd_ref, url, failurl, signature)`,
      ...(appUrl ? { openInApp: `${appUrl}/pay/go?orderId=${orderId}&method=card`, openInAppSbp: `${appUrl}/pay/go?orderId=${orderId}&method=sbp` } : {}),
    }, null, 2));
    process.exit(0);
  }

  const codeMatch = text.match(/<code>\s*(\d+)\s*<\/code>/);
  const descMatch = text.match(/<description>\s*([^<]*)\s*<\/description>/);
  console.error("Ответ ПЦ (ошибка):");
  console.error(text.slice(0, 500));
  console.log(JSON.stringify({
    ok: false,
    paygineCode: codeMatch?.[1],
    description: descMatch?.[1]?.trim() ?? "",
  }, null, 2));
  process.exit(1);
}

main();
