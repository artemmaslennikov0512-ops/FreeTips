/**
 * Paygine test/SBPTestCase — симуляция успешной оплаты по СБП (только тестовый стенд).
 * В проде не использовать. Сервис доступен только на тестовом окружении Paygine.
 *
 * Подтверждение оплаты заявки: передаётся order_id заказа → ПЦ помечает заказ оплаченным, кубышка пополняется.
 *
 * Запуск: npx tsx scripts/utils/sbp-test-case.ts <orderId> [caseId]
 *   orderId — номер заказа (из sd-register / sd-topup-card). Обязателен, если не задан PAYGINE_SBP_QRC_ID.
 *   caseId  — тест-кейс: 150 = успешная оплата (по умолчанию), 151 = неуспешная.
 *
 * Параметры — из scripts/.env (PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD).
 * Опционально в .env: SBP_CASE_ID (по умолчанию 150), PAYGINE_SBP_TEST_PATH, PAYGINE_SBP_QRC_ID.
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";

loadScriptsEnv();

const DEFAULT_CASE_ID = "150";
// Как в примере Paygine: GET test.paygine.com/test/SBPTestCase?...
const DEFAULT_SBP_TEST_PATH = "test/SBPTestCase";

function computeSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const arg1 = process.argv[2]?.trim();
  const arg2 = process.argv[3]?.trim();

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const caseId = arg2 || process.env.SBP_CASE_ID?.trim() || DEFAULT_CASE_ID;
  const sbpTestPath = process.env.PAYGINE_SBP_TEST_PATH?.trim().replace(/^\//, "") || DEFAULT_SBP_TEST_PATH;
  const qrcIdEnv = process.env.PAYGINE_SBP_QRC_ID?.trim();

  const arg1LooksLikeQrcId = !!(arg1 && arg1.length >= 20 && /^[A-Za-z0-9]+$/.test(arg1) && !/^\d+$/.test(arg1));
  const useQrcId = !!(qrcIdEnv || arg1LooksLikeQrcId);
  const qrcId = useQrcId ? (arg1LooksLikeQrcId ? arg1! : qrcIdEnv ?? "") : "";
  const orderId = useQrcId ? "" : (arg1 || (process.env.PAYGINE_SBP_TEST_ORDER_ID?.trim() ?? "")).trim();

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!useQrcId && !orderId) {
    missing.push("orderId (аргумент или PAYGINE_SBP_TEST_ORDER_ID в scripts/.env)");
  }
  if (missing.length > 0) {
    console.error("Не задано:", missing.join(", "));
    console.error("Usage: npx tsx scripts/utils/sbp-test-case.ts <orderId> [caseId]");
    console.error("  Параметры Paygine — в scripts/.env (см. scripts/.env.example).");
    process.exit(1);
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;

  if (!baseUrlStr.toLowerCase().includes("test")) {
    console.error("Предупреждение: test/SBPTestCase доступен только на тестовом стенде.");
  }

  const tagValues = [sectorStr, caseId, qrcId, orderId];
  const signature = computeSignature(tagValues, passwordStr);

  const query = new URLSearchParams();
  query.set("sector", sectorStr);
  query.set("case_id", caseId);
  if (qrcId) query.set("qrc_id", qrcId);
  else query.set("order_id", orderId);
  query.set("mode", "1");
  query.set("signature", signature);

  const path = sbpTestPath.replace(/^\//, "");
  const url = `${baseUrlStr}/${path}?${query.toString()}`;
  console.error("SBPTestCase: GET (как в примере Paygine)");
  console.error("  URL:", url.slice(0, 90) + (url.length > 90 ? "..." : ""));

  try {
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    const text = await res.text();

    console.error("SBPTestCase: HTTP", res.status, "ответ:", text.slice(0, 400));

    if (res.status >= 300 && res.status < 400) {
      console.error(`Редирект ${res.status}`, res.headers.get("location") ?? "");
      console.error(text);
      process.exit(1);
    }

    if (!res.ok) {
      console.error(`HTTP ${res.status}`);
      if (res.status === 404) {
        console.error("404 — задай в .env PAYGINE_SBP_TEST_PATH=webapi/test/SBPTestCase.");
      }
      console.error(text);
      process.exit(1);
    }

    console.log(JSON.stringify({ ok: true, orderId: orderId || qrcId, caseId, response: text.slice(0, 200) }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
