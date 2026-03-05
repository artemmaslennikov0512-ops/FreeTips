/**
 * Тест СБП по документу Paygine: Register (с fee) → SDPayInSBP → test/SBPTestCase.
 * Fee: приём по СБП 2,5% — в Register передаём amount и fee; amount зачисляется на кубышку, fee не поступает на баланс (документ, Таблица 1).
 *
 * Документ: апи.md / Оглавление1 — Register (Таблица 1), SDPayInSBP, test/SBPTestCase (тестовый стенд).
 * Подпись: Приложение №2 — конкатенация значений параметров в порядке + password → SHA256(UTF-8) → hex (lowercase) → Base64.
 *
 * Запуск: npx tsx scripts/sbp-test-by-doc.ts <amount_kop> [sd_ref]
 *   amount_kop — сумма в копейках (на кубышку зачислится эта сумма; с плательщика списывается amount + fee).
 *   sd_ref     — целевая кубышка (по умолчанию PAYGINE_SD_REF).
 *
 * Чтобы перевести в успех уже открытое окно оплаты — используйте:
 *   npx tsx scripts/utils/sbp-confirm-open-order.ts --order-id <orderId>
 *
 * Параметры из scripts/.env: PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD, PAYGINE_SD_REF.
 */

import { loadScriptsEnv } from "./utils/load-env";
import { createHash } from "crypto";

loadScriptsEnv();

// Пути по документу
const REGISTER_PATH = "/webapi/Register";
const SDPAYIN_SBP_PATH = "/webapi/b2puser/sd-services/SDPayInSBP";
const SDRELOCATE_PATH = "/webapi/b2puser/sd-services/SDRelocateFunds";
const SBP_TEST_PATH = process.env.PAYGINE_SBP_TEST_PATH?.trim() || "test/SBPTestCase";

const CURRENCY_RUB = 643;
const CURRENCY_STR = "643";
/** case_id=150 — успешная оплата (по документу тестового стенда). */
const CASE_ID_SUCCESS = "150";
const FEE_PERCENT_SBP = 2.5;
const RELOCATE_DELAY_MS = Number(process.env.PAYGINE_SBP_RELOCATE_DELAY_MS) || 12_000;
const TIMEOUT_MS = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || 30_000;

/** Подпись по Приложению №2: значения в порядке + password → SHA256(UTF-8) → hex lowercase → Base64. */
function sign(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  const sdRefArg = process.argv[3]?.trim();
  if (!amountArg) {
    console.error("Usage: npx tsx scripts/sbp-test-by-doc.ts <amount_kop> [sd_ref]");
    process.exit(1);
  }
  const amountKop = parseInt(amountArg, 10);
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("amount_kop — положительное число (копейки).");
    process.exit(1);
  }

  const baseUrl = (process.env.PAYGINE_BASE_URL?.trim() ?? "").replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const targetSdRef = (sdRefArg || process.env.PAYGINE_SD_REF?.trim()) ?? "";
  if (!baseUrl || !sector || !password || !targetSdRef) {
    console.error("В scripts/.env задайте: PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD, PAYGINE_SD_REF");
    process.exit(1);
  }

  const tempSdRef = `1tips_t_${crypto.randomUUID().replace(/-/g, "")}`;
  const reference = `sbp-doc-${Date.now()}`;
  const url = process.env.REGISTER_URL?.trim() || "https://example.com/ok";
  const failurl = process.env.REGISTER_FAILURL?.trim() || "https://example.com/fail";

  // --- Fee по документу: amount зачисляется на кубышку, fee взимается с плательщика и не поступает на баланс (Таблица 1, параметр fee). ---
  const feeKop = Math.round((amountKop * FEE_PERCENT_SBP) / 100);

  // --- 1. Register (Таблица 1). Подпись: sector, amount, currency, password. ---
  const regSig = sign([sector, String(amountKop), String(CURRENCY_RUB)], password);
  const regBody = new URLSearchParams({
    sector,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description: `Пополнение СБП ${targetSdRef}`.slice(0, 1000),
    url,
    failurl,
    signature: regSig,
    mode: "1",
    sd_ref: tempSdRef,
  });
  if (feeKop > 0) regBody.set("fee", String(feeKop));

  console.error("[1/4] Register (amount + fee):", amountKop, "коп. + fee", feeKop, "коп.");
  const regRes = await fetch(`${baseUrl}${REGISTER_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: regBody.toString(),
  });
  const regText = await regRes.text();
  if (!regRes.ok) {
    console.error("Register HTTP", regRes.status, regText.slice(0, 400));
    process.exit(1);
  }
  const orderIdMatch = regText.trim().match(/^\d+$/) || regText.match(/<id>(\d+)<\/id>/);
  if (!orderIdMatch) {
    console.error("Register: неверный ответ", regText.slice(0, 300));
    process.exit(1);
  }
  const orderId = orderIdMatch[1] ?? regText.trim();
  console.error("  orderId =", orderId);

  // --- 2. SDPayInSBP (инициируем оплату СБП по заказу). Подпись по документу для SDPayInSBP. ---
  const payInSig = sign([sector, orderId, String(amountKop), CURRENCY_STR, tempSdRef], password);
  const payInBody = new URLSearchParams({
    sector,
    id: orderId,
    amount: String(amountKop),
    currency: CURRENCY_STR,
    sd_ref: tempSdRef,
    url,
    failurl,
    signature: payInSig,
  });
  console.error("[2/4] SDPayInSBP: POST");
  const payInRes = await fetch(`${baseUrl}${SDPAYIN_SBP_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payInBody.toString(),
    redirect: "manual",
  });
  await payInRes.text();
  if (!payInRes.ok && payInRes.status !== 302 && payInRes.status !== 303) {
    console.error("SDPayInSBP HTTP", payInRes.status);
    process.exit(1);
  }

  // --- 3. test/SBPTestCase (по документу тестового стенда). GET, параметры: sector, case_id, order_id, mode, signature. ---
  const qrcId = "";
  const sbpSig = sign([sector, CASE_ID_SUCCESS, qrcId, orderId], password);
  const sbpQuery = new URLSearchParams({
    sector,
    case_id: CASE_ID_SUCCESS,
    order_id: orderId,
    mode: "1",
    signature: sbpSig,
  });
  const sbpUrl = `${baseUrl.replace(/\/$/, "")}/${SBP_TEST_PATH.replace(/^\//, "")}?${sbpQuery.toString()}`;
  console.error("[3/4] SBPTestCase: GET (подтверждение оплаты по документу)");
  const sbpRes = await fetch(sbpUrl, { method: "GET", redirect: "manual" });
  const sbpText = await sbpRes.text();
  if (!sbpRes.ok) {
    console.error("SBPTestCase HTTP", sbpRes.status, sbpText.slice(0, 300));
    process.exit(1);
  }
  console.error("  Ответ:", sbpText.slice(0, 200));

  // --- 4. Перевод на целевую кубышку: новый Register (заказ на перевод) + SDRelocateFunds. На кубышку зачислен только amount. ---
  console.error("[4/4] Ожидание", RELOCATE_DELAY_MS / 1000, "с → Register (перевод) + SDRelocateFunds...");
  await new Promise((r) => setTimeout(r, RELOCATE_DELAY_MS));

  const refRel = `relocate-${Date.now()}`;
  const regRelSig = sign([sector, String(amountKop), String(CURRENCY_RUB)], password);
  const regRelBody = new URLSearchParams({
    sector,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference: refRel,
    description: `Transfer ${tempSdRef} → ${targetSdRef}`.slice(0, 1000),
    url: "https://example.com/ok",
    failurl: "https://example.com/fail",
    signature: regRelSig,
    mode: "1",
  });
  const regRelRes = await fetch(`${baseUrl}${REGISTER_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: regRelBody.toString(),
  });
  const regRelText = await regRelRes.text();
  const relOrderIdMatch = regRelText.trim().match(/^\d+$/) || regRelText.match(/<id>(\d+)<\/id>/);
  if (!regRelRes.ok || !relOrderIdMatch) {
    console.error("Register (перевод) HTTP", regRelRes.status, regRelText.slice(0, 200));
    console.error("Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, targetSdRef);
    process.exit(1);
  }
  const relocateOrderId = relOrderIdMatch[1] ?? regRelText.trim();

  const relSig = sign([sector, relocateOrderId, tempSdRef, targetSdRef], password);
  const relBody = new URLSearchParams({
    sector,
    id: relocateOrderId,
    from_sd_ref: tempSdRef,
    to_sd_ref: targetSdRef,
    signature: relSig,
  });
  const relRes = await fetch(`${baseUrl}${SDRELOCATE_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: relBody.toString(),
  });
  const relText = await relRes.text();
  const relOk = relText.includes("<state>APPROVED</state>") || relText.includes("<order_state>COMPLETED</order_state>");
  if (!relOk) {
    console.error("SDRelocateFunds:", relText.match(/<code>([^<]+)<\/code>/)?.[1] ?? relText.slice(0, 200));
    console.error("Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, targetSdRef);
  } else {
    console.error("  Средства на кубышке", targetSdRef);
  }

  console.error("Готово. amount:", amountKop, "коп., fee:", feeKop, "коп. (не на кубышку).");
  console.log(JSON.stringify({ ok: true, orderId, relocateOrderId, amountKop, feeKop, sdRef: targetSdRef }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
