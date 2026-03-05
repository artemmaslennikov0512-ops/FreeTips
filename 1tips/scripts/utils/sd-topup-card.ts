/**
 * Пополнение кубышки по карте (SDPayIn).
 * Регистрирует заказ (Register), генерирует форму оплаты картой и открывает её в браузере.
 * В браузере введите тестовую карту Paygine — после успешной оплаты кубышка пополнится.
 *
 * Запуск: npx tsx scripts/utils/sd-topup-card.ts <amount_kop>
 *   amount_kop — сумма пополнения в копейках (например 10000 = 100 ₽).
 *
 * Параметры — из scripts/.env (PAYGINE_*, PAYGINE_SD_REF, REGISTER_*).
 * Порядок: Register → форма SDPayIn (карта) → открытие в браузере.
 */

import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const SDPAYIN_PATH = "/webapi/b2puser/sd-services/SDPayIn";
const CURRENCY_RUB = 643;
const CURRENCY_STR = "643";
const DEFAULT_TIMEOUT_MS = 30_000;

function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openInBrowser(filePath: string): void {
  const pathForShell = filePath.replace(/\\/g, "/");
  try {
    if (process.platform === "darwin") {
      execSync(`open "${pathForShell}"`);
    } else if (process.platform === "win32") {
      execSync(`start "" "${pathForShell}"`);
    } else {
      execSync(`xdg-open "${pathForShell}"`);
    }
  } catch {
    console.error("Не удалось открыть браузер. Откройте файл вручную:", filePath);
  }
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  if (!amountArg) {
    console.error("Usage: npx tsx scripts/utils/sd-topup-card.ts <amount_kop>");
    console.error("  amount_kop — сумма пополнения в копейках (например 10000 для 100 ₽).");
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

  // 1) Register
  const reference = `topup-card-${Date.now()}`;
  const regSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const regBody = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description: `Пополнение кубышки ${sdRefStr}`.slice(0, 1000),
    url: successUrl,
    failurl: failUrl,
    signature: regSignature,
    mode: "1",
    sd_ref: sdRefStr,
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
  const orderId = orderIdMatch[1] ?? text.trim();

  // 2) Форма SDPayIn (карта)
  const paySignature = computeSignature(
    [sectorStr, orderId, String(amountKop), CURRENCY_STR, sdRefStr],
    passwordStr,
  );
  const action = `${baseUrlStr}${SDPAYIN_PATH}`;
  const fields: Array<[string, string]> = [
    ["sector", sectorStr],
    ["id", orderId],
    ["amount", String(amountKop)],
    ["currency", CURRENCY_STR],
    ["sd_ref", sdRefStr],
    ["url", successUrl],
    ["failurl", failUrl],
    ["signature", paySignature],
  ];
  const formInputs = fields
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
    .join("\n    ");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Пополнение кубышки картой — ${(amountKop / 100).toFixed(2)} ₽</title>
</head>
<body>
  <p>Пополнение кубышки по карте: <strong>${(amountKop / 100).toFixed(2)} ₽</strong> (заказ ${escapeHtml(orderId)}).</p>
  <p>Перенаправление на Paygine…</p>
  <form id="payForm" method="post" action="${escapeHtml(action)}">
    ${formInputs}
    <button type="submit">Оплатить картой</button>
  </form>
  <script>document.getElementById("payForm").submit();</script>
</body>
</html>
`;

  const outDir = join(process.cwd(), "scripts", "out");
  const outPath = join(outDir, `pay-card-${orderId}.html`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, html, "utf8");

  console.log(JSON.stringify({
    ok: true,
    orderId,
    amountKop,
    amountRub: (amountKop / 100).toFixed(2),
    htmlPath: outPath,
  }, null, 2));

  const openBrowser = process.env.OPEN_BROWSER?.trim();
  if (openBrowser === "1" || openBrowser === "true") {
    openInBrowser(outPath);
  }
}

main();
