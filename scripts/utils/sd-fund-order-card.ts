/**
 * Пополнение заказа картой: генерирует HTML-форму для оплаты по SDPayIn (карта).
 * После Register открой сгенерированный HTML в браузере, нажми «Оплатить картой» — откроется страница Paygine для ввода тестовой карты.
 * Номер тестовой карты выдаётся после регистрации ТСП в ПЦ (апи.md).
 *
 * Запуск: npx tsx scripts/utils/sd-fund-order-card.ts <orderId> <amount_kop> [output.html]
 *   orderId    — из вывода sd-register.ts.
 *   amount_kop — сумма заказа в копейках (та же, что в Register).
 *   output.html — путь к файлу (по умолчанию scripts/out/pay-card-<orderId>.html).
 *
 * Параметры — из scripts/.env (PAYGINE_*, REGISTER_URL / REGISTER_APP_URL).
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

loadScriptsEnv();

const SDPAYIN_PATH = "/webapi/b2puser/sd-services/SDPayIn";
const CURRENCY_RUB = "643";

function computePaygineSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

function main(): void {
  const orderId = process.argv[2]?.trim();
  const amountArg = process.argv[3]?.trim();
  const outPathArg = process.argv[4]?.trim();

  if (!orderId || !amountArg) {
    console.error("Usage: npx tsx scripts/utils/sd-fund-order-card.ts <orderId> <amount_kop> [output.html]");
    console.error("  orderId    — номер заказа из sd-register.ts");
    console.error("  amount_kop — сумма в копейках (как в Register)");
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
  const sdRef = process.env.PAYGINE_SD_REF?.trim();
  const appUrl = process.env.REGISTER_APP_URL?.trim().replace(/\/$/, "");
  const successUrl = process.env.REGISTER_URL?.trim() || (appUrl ? `${appUrl}/pay/success` : "https://example.com/pay/success");
  const failUrl = process.env.REGISTER_FAILURL?.trim() || (appUrl ? `${appUrl}/pay/fail` : "https://example.com/pay/fail");

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

  // Подпись SDPayIn: sector, id, amount, currency, sd_ref, password (апи.md Таблица 3)
  const signature = computePaygineSignature(
    [sectorStr, orderId, String(amountKop), CURRENCY_RUB, sdRefStr],
    passwordStr,
  );

  const action = `${baseUrlStr}${SDPAYIN_PATH}`;
  const fields: Array<[string, string]> = [
    ["sector", sectorStr],
    ["id", orderId],
    ["amount", String(amountKop)],
    ["currency", CURRENCY_RUB],
    ["sd_ref", sdRefStr],
    ["url", successUrl],
    ["failurl", failUrl],
    ["signature", signature],
  ];

  const formInputs = fields
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
    .join("\n    ");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Оплата картой — заказ ${escapeHtml(orderId)}</title>
</head>
<body>
  <p>Заказ <strong>${escapeHtml(orderId)}</strong>, сумма <strong>${(amountKop / 100).toFixed(2)} ₽</strong>.</p>
  <p>Нажмите кнопку — откроется страница Paygine для ввода тестовой карты.</p>
  <form id="f" method="post" action="${escapeHtml(action)}">
    ${formInputs}
    <button type="submit">Оплатить картой</button>
  </form>
</body>
</html>
`;

  const outPath = outPathArg || join(process.cwd(), "scripts", "out", `pay-card-${orderId}.html`);
  try {
    mkdirSync(dirname(outPath), { recursive: true });
  } catch {
    // dir exists
  }
  writeFileSync(outPath, html, "utf8");

  console.log(JSON.stringify({
    ok: true,
    orderId,
    amountKop,
    htmlPath: outPath,
    hint: "Откройте htmlPath в браузере и нажмите «Оплатить картой». Введите тестовую карту Paygine.",
  }, null, 2));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main();
