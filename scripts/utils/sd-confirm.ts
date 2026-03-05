/**
 * Подтверждение оплаты по СБП (только тестовый стенд Paygine).
 * Вызывает test/SBPTestCase с order_id и case_id=150 — симулирует успешную оплату по СБП.
 * После успеха кубышка заказа пополняется, можно делать вывод (sd-payout).
 *
 * Запуск: npx tsx scripts/utils/sd-confirm.ts <orderId> [caseId]
 *   orderId — номер заказа (из sd-register или из вывода пополнения по карте).
 *   caseId  — по умолчанию 150 (успешная оплата); 151 = неуспешная.
 *
 * Параметры — из scripts/.env (PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD).
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";

loadScriptsEnv();

// Как в примере Paygine: GET test.paygine.com/test/SBPTestCase?... При 404 попробуй в .env: PAYGINE_SBP_TEST_PATH=webapi/test/SBPTestCase
const SBP_TEST_PATH = process.env.PAYGINE_SBP_TEST_PATH?.trim() || "test/SBPTestCase";
const CASE_ID_SUCCESS = "150";
const DEFAULT_TIMEOUT_MS = 30_000;

function computeSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const orderId = process.argv[2]?.trim();
  const caseId = process.argv[3]?.trim() || CASE_ID_SUCCESS;

  if (!orderId) {
    console.error("Usage: npx tsx scripts/utils/sd-confirm.ts <orderId> [caseId]");
    console.error("  orderId — номер заказа (из sd-register или после пополнения по карте).");
    console.error("  caseId  — 150 = успешная оплата (по умолчанию), 151 = неуспешная");
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

  if (!baseUrlStr.toLowerCase().includes("test")) {
    console.error("Предупреждение: test/SBPTestCase только на тестовом стенде (test.paygine.com).");
  }

  const path = SBP_TEST_PATH.replace(/^\//, "");
  const qrcId = "";
  const tagValues: string[] = [sectorStr, caseId, qrcId, orderId];
  const signature = computeSignature(tagValues, passwordStr);
  const query = new URLSearchParams({
    sector: sectorStr,
    case_id: caseId,
    order_id: orderId,
    mode: "1",
    signature,
  });
  const url = baseUrlStr.replace(/\/$/, "") + "/" + path + "?" + query.toString();
  console.error("SBPTestCase: GET (как в примере Paygine)");
  console.error("  URL:", url.slice(0, 90) + (url.length > 90 ? "..." : ""));

  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(url, { method: "GET", redirect: "manual" });
    text = await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(isAbort ? "Timeout" : err);
    process.exit(1);
  }
  clearTimeout(timeoutId);

  console.error("SBPTestCase: HTTP", res.status, "ответ:", text.slice(0, 400));

  if (res.status >= 300 && res.status < 400) {
    console.error(`Редирект ${res.status}`, res.headers.get("location") ?? "");
    console.error(text);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    console.error(text);
    if (res.status === 404) {
      console.error("404: задай в .env PAYGINE_SBP_TEST_PATH=webapi/test/SBPTestCase или уточни у Paygine.");
    }
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, orderId, caseId, response: text.slice(0, 300) }, null, 2));
  console.error("Готово. Кубышка заказа пополнена (case_id=150). Можно вызвать sd-payout.");
  process.exit(0);
}

main();
