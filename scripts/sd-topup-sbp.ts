/**
 * Пополнение кубышки по СБП (только тестовый стенд Paygine).
 * Register с временной кубышкой → SDPayInSBP → SBPTestCase → SDRelocateFunds на целевую. Итог: деньги на sd_ref.
 * На тестовом СБП Relocate может вернуть 133 (заказ не переходит в нужное состояние) — тогда ручной перевод по orderId.
 *
 * Запуск: npx tsx scripts/sd-topup-sbp.ts <amount_kop> [sd_ref]
 *   amount_kop — сумма в копейках.
 *   sd_ref     — на какую кубышку пополнять (если не указан — из PAYGINE_SD_REF в .env).
 *
 * Параметры — из scripts/.env (PAYGINE_*, REGISTER_*).
 */

import { loadScriptsEnv } from "./utils/load-env";
import { createHash } from "crypto";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const SDPAYIN_SBP_PATH = "/webapi/b2puser/sd-services/SDPayInSBP";
const SDRELOCATE_PATH = "/webapi/b2puser/sd-services/SDRelocateFunds";
// Как в примере Paygine: test.paygine.com/test/SBPTestCase?... (GET). При 404 попробуй в .env: PAYGINE_SBP_TEST_PATH=webapi/test/SBPTestCase
const SBP_TEST_PATH = process.env.PAYGINE_SBP_TEST_PATH?.trim() || "test/SBPTestCase";
const CURRENCY_RUB = 643;
const CURRENCY_STR = "643";
const CASE_ID_SUCCESS = "150";
const DEFAULT_TIMEOUT_MS = 30_000;
const SBP_RELOCATE_DELAY_MS = Number(process.env.PAYGINE_SBP_RELOCATE_DELAY_MS) || 12_000;
const SBP_RELOCATE_RETRY_MS = 8_000;

function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  const sdRefArg = process.argv[3]?.trim();
  if (!amountArg) {
    console.error("Usage: npx tsx scripts/sd-topup-sbp.ts <amount_kop> [sd_ref]");
    console.error("  sd_ref — на какую кубышку пополнять (по умолчанию PAYGINE_SD_REF из .env).");
    process.exit(1);
  }
  const amountKop = parseInt(amountArg, 10);
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("amount_kop должно быть положительным числом.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRefEnv = process.env.PAYGINE_SD_REF?.trim();
  const sdRef = sdRefArg || sdRefEnv;
  const appUrl = process.env.REGISTER_APP_URL?.trim().replace(/\/$/, "");
  const url = process.env.REGISTER_URL?.trim() || (appUrl ? `${appUrl}/pay/success` : "https://example.com/pay/success");
  const failurl = process.env.REGISTER_FAILURL?.trim() || (appUrl ? `${appUrl}/pay/fail` : "https://example.com/pay/fail");

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!sdRef) missing.push("PAYGINE_SD_REF в .env или аргумент sd_ref");
  if (missing.length > 0) {
    console.error("Не задано в scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;
  const targetSdRef = sdRef as string;
  const tempSdRef = `1tips_t_${crypto.randomUUID().replace(/-/g, "")}`;
  if (sdRefArg) console.error("Целевая кубышка (из аргумента):", targetSdRef);
  else console.error("Целевая кубышка (из .env PAYGINE_SD_REF):", targetSdRef);
  console.error("Временная кубышка:", tempSdRef);
  const reference = `topup-sbp-${Date.now()}`;
  // Комиссия как в проде: приём по СБП 2,5%; amount зачисляется на кубышку, fee не поступает на баланс (документ).
  const feeKop = Math.round((amountKop * 2.5) / 100);

  const regSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const regBody = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description: `Пополнение СБП ${targetSdRef}`.slice(0, 1000),
    url,
    failurl,
    signature: regSignature,
    mode: "1",
    sd_ref: tempSdRef,
  });
  if (feeKop > 0) regBody.set("fee", String(feeKop));

  const registerUrl = `${baseUrlStr}${REGISTER_PATH}`;
  console.error("[1/4] Register: POST", registerUrl);

  let res: Response;
  let text: string;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    res = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regBody.toString(),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Register: ошибка запроса", err);
    process.exit(1);
  }
  clearTimeout(timeoutId);

  console.error("Register: HTTP", res.status, "ответ (первые 300 символов):", text.slice(0, 300));

  if (!res.ok) {
    console.error("Register HTTP", res.status, text);
    process.exit(1);
  }

  const orderIdMatch = text.trim().match(/^\d+$/) || text.match(/<id>(\d+)<\/id>/);
  if (!orderIdMatch) {
    console.error("Register: неверный ответ", text.slice(0, 300));
    process.exit(1);
  }
  const orderId = orderIdMatch[1] ?? text.trim();
  console.error("Register: ID заказа (orderId) =", orderId);

  // Как в ручном сценарии Paygine: сначала "открыть" оплату СБП (SDPayInSBP), потом подтвердить через SBPTestCase. sd_ref = временная (как в Register).
  const sdPayInSignature = computeSignature([sectorStr, orderId, String(amountKop), CURRENCY_STR, tempSdRef], passwordStr);
  const sdPayInBody = new URLSearchParams({
    sector: sectorStr,
    id: orderId,
    amount: String(amountKop),
    currency: CURRENCY_STR,
    sd_ref: tempSdRef,
    url,
    failurl,
    signature: sdPayInSignature,
  });
  const sdPayInUrl = baseUrlStr.replace(/\/$/, "") + SDPAYIN_SBP_PATH;
  console.error("[2/4] SDPayInSBP: POST (инициируем оплату СБП по заказу, как «открытие страницы оплаты»)");
  console.error("  URL:", sdPayInUrl);

  let sdPayInRes: Response;
  let sdPayInText: string;
  const sdPayInController = new AbortController();
  const sdPayInTimeoutId = setTimeout(() => sdPayInController.abort(), DEFAULT_TIMEOUT_MS);
  try {
    sdPayInRes = await fetch(sdPayInUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: sdPayInBody.toString(),
      redirect: "manual",
      signal: sdPayInController.signal,
    });
    sdPayInText = await sdPayInRes.text();
  } catch (err) {
    clearTimeout(sdPayInTimeoutId);
    console.error("SDPayInSBP: ошибка запроса", err);
    process.exit(1);
  }
  clearTimeout(sdPayInTimeoutId);

  console.error("SDPayInSBP: HTTP", sdPayInRes.status, "Location:", sdPayInRes.headers.get("location") ?? "-", "ответ:", sdPayInText.slice(0, 200));

  if (!sdPayInRes.ok && sdPayInRes.status !== 302 && sdPayInRes.status !== 303) {
    console.error("SDPayInSBP HTTP", sdPayInRes.status, sdPayInText);
    process.exit(1);
  }

  const caseId = CASE_ID_SUCCESS;
  const qrcId = "";
  const sbpSignature = computeSignature([sectorStr, caseId, qrcId, orderId], passwordStr);
  const sbpQuery = new URLSearchParams({
    sector: sectorStr,
    case_id: caseId,
    order_id: orderId,
    mode: "1",
    signature: sbpSignature,
  });
  const sbpPath = SBP_TEST_PATH.replace(/^\//, "");
  const sbpUrl = baseUrlStr.replace(/\/$/, "") + "/" + sbpPath + "?" + sbpQuery.toString();
  console.error("[3/4] SBPTestCase: GET (подтверждаем оплату по СБП, как в примере Paygine)");
  console.error("  Path:", baseUrlStr.replace(/\/$/, "") + "/" + sbpPath);
  console.error("  URL (полный):", sbpUrl);

  let sbpRes: Response;
  let sbpText: string;
  const sbpController = new AbortController();
  const sbpTimeoutId = setTimeout(() => sbpController.abort(), DEFAULT_TIMEOUT_MS);
  try {
    sbpRes = await fetch(sbpUrl, { method: "GET", redirect: "manual" });
    sbpText = await sbpRes.text();
  } catch (err) {
    clearTimeout(sbpTimeoutId);
    console.error("SBPTestCase: ошибка запроса", err);
    process.exit(1);
  }
  clearTimeout(sbpTimeoutId);

  console.error("SBPTestCase: HTTP", sbpRes.status, "ответ (первые 500 символов):", sbpText.slice(0, 500));

  if (sbpRes.status >= 300 && sbpRes.status < 400) {
    console.error("SBPTestCase редирект", sbpRes.status, sbpRes.headers.get("location") ?? "", sbpText);
    process.exit(1);
  }
  if (!sbpRes.ok) {
    console.error("SBPTestCase HTTP", sbpRes.status, "— проверь PAYGINE_BASE_URL и PAYGINE_SBP_TEST_PATH (по умолчанию test/SBPTestCase). Полный URL выше.");
    console.error("Тело ответа:", sbpText);
    process.exit(1);
  }

  // По документу Paygine: для перевода с кубышки на кубышку нужен НОВЫЙ заказ (Register на перевод), не заказ на пополнение. Иначе ПЦ возвращает 133.
  // На временную кубышку зачисляется только amount (fee не поступает на баланс), поэтому переводим amountKop.
  console.error("[4/4] Ожидание", SBP_RELOCATE_DELAY_MS / 1000, "с, затем Register (заказ на перевод) + SDRelocateFunds...");
  await new Promise((r) => setTimeout(r, SBP_RELOCATE_DELAY_MS));

  const refRelocate = `relocate-sbp-${Date.now()}`;
  const regRelocateSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const regRelocateBody = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference: refRelocate,
    description: `Transfer ${tempSdRef} → ${targetSdRef}`.slice(0, 1000),
    url: "https://example.com/ok",
    failurl: "https://example.com/fail",
    signature: regRelocateSignature,
    mode: "1",
  });
  let regRelocateRes: Response;
  let regRelocateText: string;
  try {
    regRelocateRes = await fetch(`${baseUrlStr}${REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regRelocateBody.toString(),
    });
    regRelocateText = await regRelocateRes.text();
  } catch (err) {
    console.error("Register (заказ на перевод): ошибка", err);
    console.error("  Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, targetSdRef);
    process.exit(1);
  }
  const relocateOrderIdMatch = regRelocateText.trim().match(/^\d+$/) || regRelocateText.match(/<id>(\d+)<\/id>/);
  if (!regRelocateRes.ok || !relocateOrderIdMatch) {
    console.error("Register (заказ на перевод): HTTP", regRelocateRes.status, regRelocateText.slice(0, 300));
    console.error("  Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, targetSdRef);
    process.exit(1);
  }
  const relocateOrderId = relocateOrderIdMatch[1] ?? regRelocateText.trim();
  console.error("  Заказ на перевод orderId:", relocateOrderId);

  const doRelocate = async (): Promise<{ ok: boolean; code?: string }> => {
    const sig = computeSignature([sectorStr, relocateOrderId, tempSdRef, targetSdRef], passwordStr);
    const body = new URLSearchParams({
      sector: sectorStr,
      id: relocateOrderId,
      from_sd_ref: tempSdRef,
      to_sd_ref: targetSdRef,
      signature: sig,
    });
    const relRes = await fetch(baseUrlStr.replace(/\/$/, "") + SDRELOCATE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await relRes.text();
    const code = text.match(/<code>(\d+)<\/code>/)?.[1];
    return { ok: relRes.ok && !code, code };
  };

  let rel = await doRelocate();
  if (!rel.ok && rel.code === "133") {
    console.error("  SDRelocateFunds: 133, повтор через", SBP_RELOCATE_RETRY_MS / 1000, "с...");
    await new Promise((r) => setTimeout(r, SBP_RELOCATE_RETRY_MS));
    rel = await doRelocate();
  }
  if (!rel.ok) {
    console.error("  SDRelocateFunds: ошибка ПЦ", rel.code ?? "");
    console.error("  Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, targetSdRef);
    if (feeKop > 0) {
      console.error("  Если 128 Invalid amount — на тесте могло зачислиться amount+fee. Попробуйте:", amountKop + feeKop, tempSdRef, targetSdRef);
    }
  } else {
    console.error("  SDRelocateFunds: средства на кубышке", targetSdRef);
  }

  console.error("Пополнение по СБП выполнено.");
  console.error("  orderId (пополнение):", orderId);
  console.error("  orderId (перевод):", relocateOrderId);
  console.error("  sd_ref (целевая):", targetSdRef);
  console.error("  Ручной перевод: npx tsx scripts/utils/sd-relocate.ts", amountKop, tempSdRef, "<to_sd_ref>");
  console.log(JSON.stringify({ ok: true, orderId, relocateOrderId, sdRef: targetSdRef, amountKop, response: sbpText.slice(0, 200) }, null, 2));
  process.exit(0);
}

main();
