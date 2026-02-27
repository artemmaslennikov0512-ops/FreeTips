/**
 * Перевод средств между кубышками (SDRelocateFunds).
 * По указанию поддержки Paygine: для перевода с одной кубышки на другую нужно зарегистрировать
 * **новый** заказ (Register), затем вызвать SDRelocateFunds с этим orderId. Заказ на пополнение
 * (старый orderId) для Relocate использовать нельзя — 133.
 *
 * Документация: апи.md, Таблица 19 (SDRelocateFunds), Таблица 25 (Register).
 *
 * Запуск: npx tsx scripts/utils/sd-relocate.ts <amount_kop> <from_sd_ref> <to_sd_ref> [unique_key]
 *   amount_kop — сумма перевода в копейках.
 *   from_sd_ref — с какой кубышки списать.
 *   to_sd_ref   — на какую кубышку зачислить.
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const SDRELOCATE_PATH = "/webapi/b2puser/sd-services/SDRelocateFunds";
const CURRENCY_RUB = 643;
const DEFAULT_TIMEOUT_MS = 30_000;

function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  const fromArg = process.argv[3]?.trim();
  const toArg = process.argv[4]?.trim();
  const uniqueKey = process.argv[5]?.trim();

  if (!amountArg || !fromArg || !toArg) {
    console.error("Usage: npx tsx scripts/utils/sd-relocate.ts <amount_kop> <from_sd_ref> <to_sd_ref> [unique_key]");
    console.error("  amount_kop — сумма перевода в копейках.");
    console.error("  from_sd_ref — с какой кубышки списать.");
    console.error("  to_sd_ref   — на какую кубышку зачислить.");
    process.exit(1);
  }

  const amountKop = parseInt(amountArg, 10);
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("amount_kop должно быть положительным числом.");
    process.exit(1);
  }

  const fromSdRef = fromArg;
  const toSdRef = toArg;
  if (fromSdRef === toSdRef) {
    console.error("from_sd_ref и to_sd_ref не должны совпадать.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (missing.length > 0) {
    console.error("Не задано в scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;

  // [1/2] Register — новый заказ на перевод (не заказ на пополнение).
  const reference = `relocate-${Date.now()}`;
  const description = `Transfer ${fromSdRef} → ${toSdRef}`.slice(0, 1000);
  const regSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const regBody = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description,
    url: "https://example.com/ok",
    failurl: "https://example.com/fail",
    signature: regSignature,
    mode: "1",
  });

  const registerUrl = baseUrlStr + REGISTER_PATH;
  console.error("[1/2] Register (новый заказ на перевод): POST", registerUrl);
  console.error("  amount:", amountKop, "коп, reference:", reference);

  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let regRes: Response;
  let regText: string;
  try {
    regRes = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regBody.toString(),
      signal: controller.signal,
    });
    regText = await regRes.text();
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(isAbort ? "Register: Timeout" : err);
    process.exit(1);
  }
  clearTimeout(timeoutId);

  console.error("Register: HTTP", regRes.status, "ответ:", regText.slice(0, 200));

  if (!regRes.ok) {
    console.error("Register HTTP", regRes.status, regText);
    process.exit(1);
  }

  const orderIdMatch = regText.trim().match(/^\d+$/) || regText.match(/<id>(\d+)<\/id>/);
  if (!orderIdMatch) {
    console.error("Register: неверный ответ", regText.slice(0, 300));
    process.exit(1);
  }
  const orderId = orderIdMatch[1] ?? regText.trim();
  console.error("  orderId:", orderId);

  // [2/2] SDRelocateFunds — перевод с from_sd_ref на to_sd_ref по новому заказу.
  const signatureParts: string[] = [sectorStr, orderId, fromSdRef, toSdRef];
  if (uniqueKey) signatureParts.push(uniqueKey);
  const signature = computeSignature(signatureParts, passwordStr);

  const body = new URLSearchParams({
    sector: sectorStr,
    id: orderId,
    from_sd_ref: fromSdRef,
    to_sd_ref: toSdRef,
    signature,
  });
  if (uniqueKey) body.set("unique_key", uniqueKey);

  const relocateUrl = baseUrlStr + SDRELOCATE_PATH;
  const bodyStr = body.toString();
  console.error("[2/2] SDRelocateFunds: POST", relocateUrl);
  console.error("  с кубышки (from):", fromSdRef, "→ на кубышку (to):", toSdRef);
  console.error("  Тело запроса:", bodyStr);

  const relController = new AbortController();
  const relTimeoutId = setTimeout(() => relController.abort(), timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(relocateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyStr,
      signal: relController.signal,
    });
    text = await res.text();
  } catch (err) {
    clearTimeout(relTimeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(isAbort ? "SDRelocateFunds: Timeout" : err);
    process.exit(1);
  }
  clearTimeout(relTimeoutId);

  console.error("SDRelocateFunds: HTTP", res.status, "ответ:", text.slice(0, 400));

  if (!res.ok) {
    console.error("HTTP", res.status, text);
    process.exit(1);
  }

  const hasApproved = text.includes("<state>APPROVED</state>") || text.includes("<order_state>COMPLETED</order_state>");
  if (hasApproved) {
    console.error("Перевод выполнен.");
    console.log(JSON.stringify({ ok: true, orderId, amountKop, from_sd_ref: fromSdRef, to_sd_ref: toSdRef }, null, 2));
    process.exit(0);
  }

  const msgMatch = text.match(/<message>([^<]*)<\/message>/);
  const codeMatch = text.match(/<code>([^<]*)<\/code>/);
  const code = codeMatch?.[1];
  console.error("Ответ ПЦ (ошибка или неожиданный формат):", msgMatch?.[1] ?? code ?? text.slice(0, 200));
  if (code === "104") {
    console.error("Подсказка: 104 = заказ не найден.");
  }
  console.log(JSON.stringify({ ok: false, orderId, amountKop, response: text.slice(0, 300) }, null, 2));
  process.exit(1);
}

main();
