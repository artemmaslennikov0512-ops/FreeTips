/**
 * Вывод с кубышки на карту (SDPayOut) без проверки баланса.
 * Документация: апи.md, «Сервис webapi/b2puser/sd-services/SDPayOut».
 * Подпись: sector, pan, amount, currency, sd_ref, password (Приложение №2).
 * С кубышки списывается amount + fee; на карту зачисляется amount (нетто).
 *
 * Запуск:
 *   npx tsx scripts/utils/sd-payout.ts
 *     — карта и сумма из последнего успешного пополнения (sd-topup-card-auto).
 *   npx tsx scripts/utils/sd-payout.ts <amount_kop> [fee_kop]
 *     — карта из последнего пополнения, сумма (и опционально комиссия) из аргументов.
 *   npx tsx scripts/utils/sd-payout.ts <pan> <amount_kop> [fee_kop]
 *     — явно указаны карта и сумма.
 *
 * Параметры и кубышка — из scripts/.env (PAYGINE_*, PAYGINE_SD_REF).
 */

import { loadScriptsEnv } from "./load-env";
import { loadLastTopup } from "./last-topup";
import { createHash } from "crypto";

loadScriptsEnv();

const SDPAYOUT_PATH = "/webapi/b2puser/sd-services/SDPayOut";
const CURRENCY_RUB = "643";
const DEFAULT_TIMEOUT_MS = 30_000;

function computePaygineSignature(tagValuesInOrder: string[], password: string): string {
  const str = tagValuesInOrder.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const arg1 = process.argv[2]?.trim();
  const arg2 = process.argv[3]?.trim();
  const feeArg = process.argv[4]?.trim();

  const saved = loadLastTopup();
  let pan = arg1?.replace(/\s/g, "") ?? "";
  let amountKop = arg2 ? parseInt(arg2, 10) : 0;

  // Без аргументов или один аргумент — подставляем из last-topup
  if (!arg1 && !arg2) {
    if (saved && saved.pan.length >= 8 && Number.isFinite(saved.amountKop) && saved.amountKop > 0) {
      pan = saved.pan;
      amountKop = saved.amountKop;
      console.error("Используются данные последнего пополнения: карта ****" + pan.slice(-4) + ", " + (saved.amountKop / 100) + " ₽");
    } else {
      console.error("Usage: npx tsx scripts/utils/sd-payout.ts [<pan>] <amount_kop> [fee_kop]");
      console.error("  Без аргументов — карта и сумма берутся из последнего пополнения (sd-topup-card-auto).");
      console.error("  Сначала выполните пополнение, затем вывод без аргументов.");
      process.exit(1);
    }
  } else if (arg1 && !arg2) {
    // Один аргумент: либо amount (карта из saved), либо pan (сумма из saved)
    const asAmount = parseInt(arg1, 10);
    if (Number.isFinite(asAmount) && asAmount > 0 && String(asAmount) === arg1 && saved?.pan) {
      amountKop = asAmount;
      pan = saved.pan;
      console.error("Карта из последнего пополнения: ****" + pan.slice(-4) + ", сумма " + (amountKop / 100) + " ₽");
    } else if (saved && Number.isFinite(saved.amountKop) && saved.amountKop > 0 && arg1.length >= 8 && /^\d+$/.test(arg1.replace(/\s/g, ""))) {
      pan = arg1.replace(/\s/g, "");
      amountKop = saved.amountKop;
      console.error("Сумма из последнего пополнения: " + (amountKop / 100) + " ₽");
    } else {
      console.error("Usage: npx tsx scripts/utils/sd-payout.ts <amount_kop>  — карта из последнего пополнения");
      console.error("       npx tsx scripts/utils/sd-payout.ts <pan> <amount_kop> [fee_kop]");
      process.exit(1);
    }
  } else if (arg1 && arg2) {
    pan = arg1.replace(/\s/g, "");
    amountKop = parseInt(arg2, 10);
  }

  const feeKop = feeArg ? parseInt(feeArg, 10) : 0;

  if (!pan || pan.length < 8) {
    console.error("Usage: npx tsx scripts/utils/sd-payout.ts [<pan>] <amount_kop> [fee_kop]");
    console.error("  pan        — номер карты получателя (или из последнего пополнения).");
    console.error("  amount_kop — сумма к зачислению на карту (нетто), копейки.");
    console.error("  fee_kop    — комиссия (опционально); с кубышки списывается amount + fee.");
    process.exit(1);
  }
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("amount_kop должно быть положительным числом.");
    process.exit(1);
  }
  if (!Number.isFinite(feeKop) || feeKop < 0) {
    console.error("fee_kop должно быть неотрицательным числом.");
    process.exit(1);
  }

  const baseUrl = process.env.PAYGINE_BASE_URL?.trim().replace(/\/$/, "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRef = process.env.PAYGINE_SD_REF?.trim();

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
  const sdRefStr = sdRef as string;
  const passwordStr = password as string;
  const amountStr = String(amountKop);
  const signature = computePaygineSignature([sectorStr, pan, amountStr, CURRENCY_RUB, sdRefStr], passwordStr);
  const body = new URLSearchParams({
    sector: sectorStr,
    sd_ref: sdRefStr,
    pan,
    amount: amountStr,
    currency: CURRENCY_RUB,
    signature,
  });
  // ПЦ может возвращать 139 (Invalid parameter: description), если description не передан или пустой — передаём краткое значение
  body.set("description", process.env.PAYOUT_DESCRIPTION?.trim().slice(0, 1000) || "Payout");
  if (feeKop > 0) body.set("fee", String(feeKop));

  const fullUrl = `${baseUrlStr}${SDPAYOUT_PATH}`;
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

  const idMatch = text.match(/<id>(\d+)<\/id>/);
  const orderIdMatch = text.match(/<order_id>(\d+)<\/order_id>/);
  const externalId = idMatch?.[1] ?? orderIdMatch?.[1];
  const errCode = text.match(/<code>\s*([^<]+)\s*<\/code>/)?.[1];
  const errDesc = text.match(/<description>\s*([^<]*)\s*<\/description>/)?.[1]?.trim();

  if (errCode && errCode !== "0" && errCode !== "RQ00000") {
    console.error("Ответ ПЦ (ошибка):");
    console.error(text.slice(0, 500));
    console.log(JSON.stringify({
      ok: false,
      paygineCode: errCode,
      description: errDesc ?? "",
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    externalId,
    amountKop,
    feeKop,
    deductedKop: amountKop + feeKop,
  }, null, 2));
  process.exit(0);
}

main();
