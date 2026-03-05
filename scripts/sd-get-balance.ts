/**
 * Тестовый запрос баланса кубышки (SDGetBalance). Только для проверки API Paygine.
 * В проде баланс запрашивается через lib/payment/paygine-sd-get-balance.ts.
 *
 * Документация: апи.md (корень проекта), раздел «Сервис webapi/b2puser/sd-services/SDGetBalance».
 * Запрос: POST /webapi/b2puser/sd-services/SDGetBalance, application/x-www-form-urlencoded.
 * Параметры: sector, sd_ref, signature. Подпись по Приложению №2: sector, sd_ref, password.
 *
 * Запуск: npx tsx scripts/sd-get-balance.ts [sd_ref]
 * Параметры и номер кубышки — из scripts/.env (см. scripts/.env.example). Аргумент sd_ref переопределяет PAYGINE_SD_REF.
 */

import { loadScriptsEnv } from "./utils/load-env";
import { createHash } from "crypto";

loadScriptsEnv();

const DEFAULT_TIMEOUT_MS = 30_000;

function computePaygineSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const sdRefArg = process.argv[2]?.trim();
  const sdRef = sdRefArg || process.env.PAYGINE_SD_REF?.trim();

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!sdRef) missing.push("PAYGINE_SD_REF или аргумент sd_ref");
  if (missing.length > 0) {
    console.error("Не задано (заполни scripts/.env по образцу scripts/.env.example):", missing.join(", "));
    console.error("Usage: npx tsx scripts/sd-get-balance.ts [sd_ref]");
    process.exit(1);
  }

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;
  const sdRefStr = sdRef as string;

  const path = "/webapi/b2puser/sd-services/SDGetBalance";
  const url = `${baseUrlStr}${path}`;

  // Подпись по апи.md, Таблица 22, Приложение №2: sector, sd_ref, password.
  const signature = computePaygineSignature([sectorStr, sdRefStr], passwordStr);
  const body = new URLSearchParams({
    sector: sectorStr,
    sd_ref: sdRefStr,
    signature,
  });
  const bodyStr = body.toString();

  console.error("--- SDGetBalance (апи.md: Таблица 22) ---");
  console.error(`POST ${path}`);
  console.error(`Host: ${new URL(url).host}`);
  console.error("Content-Type: application/x-www-form-urlencoded");
  console.error("(body: sector, sd_ref, signature — подпись: sector + sd_ref + password)");
  console.error("---");

  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: bodyStr,
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

  // Успех: по апи.md приходит <sd_balance><balance>...</balance>...</sd_balance>
  const balanceMatch = text.match(/<balance>(\d+)<\/balance>/);
  if (balanceMatch) {
    const balanceKop = Number(balanceMatch[1]);
    const sdRefMatch = text.match(/<sd_ref>([^<]*)<\/sd_ref>/);
    const currencyMatch = text.match(/<currency>([^<]*)<\/currency>/);
    const sdStateMatch = text.match(/<sd_state>([^<]*)<\/sd_state>/);
    const availableMatch = text.match(/<available_balance>(\d+)<\/available_balance>/);
    console.log(JSON.stringify({
      ok: true,
      balanceKop,
      balanceRub: (balanceKop / 100).toFixed(2),
      sdRef: sdRefMatch?.[1] ?? sdRef,
      currency: currencyMatch?.[1],
      sdState: sdStateMatch?.[1],
      availableBalanceKop: availableMatch ? Number(availableMatch[1]) : undefined,
    }, null, 2));
    process.exit(0);
  }

  // Ошибка: <error>, <code>, <description> (Приложение №1)
  const codeMatch = text.match(/<code>\s*(\d+)\s*<\/code>/);
  const descMatch = text.match(/<description>\s*([^<]*)\s*<\/description>/);
  const code = codeMatch?.[1];
  const description = descMatch?.[1]?.trim() ?? "";
  console.error("Ответ ПЦ (ошибка):");
  console.error(text.slice(0, 500));
  console.log(JSON.stringify({
    ok: false,
    paygineCode: code,
    description,
    hint: "Код 167 — сектор не поддерживает операцию (баланс/кубышки). Проверь настройки сектора в ЛК Paygine.",
  }, null, 2));
  process.exit(1);
}

main();
