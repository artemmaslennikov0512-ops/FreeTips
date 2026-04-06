/**
 * Цепочка вывода как в ЛК: Register (заказ на SDPayOutPage) → POST на SDPayOutPage.
 * В stderr печатаются сырые ответы ПЦ на оба шага — удобно смотреть XML/HTML и коды ошибок
 * (аналогично scripts/utils/sd-relocate.ts для перелива).
 *
 * Откуда списываются деньги:
 *   Только с кубышки Paygine (sd_ref) в процессинге. Это тот же идентификатор, что поле
 *   user.paygineSdRef в БД приложения. «Баланс в ЛК FreeTips» считается по БД; реальные
 *   рубли на вывод должны лежать на этой кубышке в ПЦ (после переливов с заказов).
 *   PAYGINE_SD_REF в .env — лишь значение по умолчанию; для реального официанта укажите
 *   его кубышку: --sd-ref=...
 *
 * Второй шаг возвращает HTML (страница формы или страница ошибки Paygine) — целиком в консоль.
 *
 * Запуск из корня репозитория (как на сервере: `cd ~/1tips && npx tsx …`):
 *   npx tsx scripts/utils/sd-payout-page.ts <amount_kop> [fee_kop] [--sd-ref=...]
 *
 * PAN в запрос не передаётся — как в ЛК: карту должен запросить сам Paygine на своей странице.
 * Скрипт нужен, чтобы увидеть сырой HTML/XML ответа ПЦ, если вместо формы приходит ошибка
 * («Система не поддерживает операцию» и т.д.) — это настройки/продукт у Paygine, не номер карты.
 *
 * Переменные читаются из корневого `.env` (как у Docker), затем `.env.local`, затем `scripts/.env`:
 *   PAYGINE_BASE_URL, PAYGINE_SECTOR, PAYGINE_PASSWORD, PAYGINE_SD_REF (если нет --sd-ref)
 *   PAYOUT_PUBLIC_BASE_URL или NEXT_PUBLIC_APP_URL — публичный URL для url/failurl/notify_url;
 *     иначе https://example.com (ПЦ может отклонить невалидные URL в проде).
 */

import { loadScriptsEnv } from "./load-env";
import { extractPayoutCliFlags } from "./argv-payout-cli";
import { buildPaygineSignature } from "../../lib/payment/paygine/signature";
import { feeKopForPayout } from "../../lib/payment/paygine-fee";

loadScriptsEnv();

const REGISTER_PATH = "/Register";
const SDPAYOUT_PAGE_PATH = "/b2puser/sd-services/SDPayOutPage";
const CURRENCY_RUB = 643;
const DEFAULT_TIMEOUT_MS = 30_000;

function ensureBaseWebapi(base: string): string {
  const u = base.replace(/\/$/, "");
  if (u.endsWith("/webapi")) return u;
  return `${u}/webapi`;
}

function extractHtmlErrorSnippet(html: string): string | null {
  const err = html.match(/class="form-error__text"[^>]*>([^<]+)</i);
  if (err?.[1]) return err[1].trim();
  const notify = html.match(/class="notify-title__text"[^>]*>([^<]+)</i);
  if (notify?.[1]) return notify[1].trim();
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (t?.[1]) return t[1].trim();
  return null;
}

async function main(): Promise<void> {
  const { rest, sdRef: sdRefFromFlag, pan: panIgnored } = extractPayoutCliFlags(process.argv.slice(2));
  if (panIgnored?.trim()) {
    console.error("Предупреждение: --pan= в этом скрипте не используется (диагностика формы без карты).");
  }
  const amountArg = rest[0]?.trim();
  const feeArg = rest[1]?.trim();

  if (!amountArg) {
    console.error("Usage: npx tsx scripts/utils/sd-payout-page.ts <amount_kop> [fee_kop] [--sd-ref=...]");
    console.error("  fee_kop — опционально; по умолчанию как в приложении (feeKopForPayout).");
    console.error("  --sd-ref= — кубышка Paygine (как paygineSdRef в БД); иначе PAYGINE_SD_REF.");
    console.error("  PAN не передаётся — смотрим, отдаёт ли ПЦ форму ввода карты или страницу ошибки.");
    process.exit(1);
  }

  const amountKop = parseInt(amountArg, 10);
  if (!Number.isFinite(amountKop) || amountKop <= 0) {
    console.error("amount_kop должно быть положительным числом.");
    process.exit(1);
  }

  let feeKop: number;
  if (feeArg) {
    feeKop = parseInt(feeArg, 10);
    if (!Number.isFinite(feeKop) || feeKop < 0) {
      console.error("fee_kop должно быть неотрицательным числом.");
      process.exit(1);
    }
  } else {
    feeKop = feeKopForPayout(amountKop);
  }

  const rawBase = process.env.PAYGINE_BASE_URL?.trim();
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  const sdRef = (sdRefFromFlag?.trim() || process.env.PAYGINE_SD_REF?.trim()) ?? "";

  const missing: string[] = [];
  if (!rawBase) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!sdRef) missing.push("PAYGINE_SD_REF или --sd-ref=");
  if (missing.length > 0) {
    console.error("Не задано в .env / scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  console.error(
    "Источник средств: кубышка Paygine sd_ref (ПЦ), не запись баланса в БД FreeTips.",
    "Сейчас sd_ref:",
    sdRef,
    sdRefFromFlag ? "(из --sd-ref)" : "(из PAYGINE_SD_REF)",
  );
  console.error(
    "Проверьте баланс кубышки в ЛК Paygine / sd-get-balance; сумма списания с кубышки:",
    (amountKop + feeKop) / 100,
    "₽ (на карту",
    amountKop / 100,
    "₽ + комиссия",
    feeKop / 100,
    "₽).",
  );
  console.error(
    "Режим диагностики: POST на SDPayOutPage только sector, id, sd_ref, signature — без pan (как при открытии формы в ЛК).",
  );

  const baseUrl = ensureBaseWebapi(rawBase as string);
  const publicBase =
    process.env.PAYOUT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "https://example.com";
  const reference = `sdpp-script-${Date.now()}`;
  const amountRub = (amountKop / 100).toFixed(2);
  const feeRub = (feeKop / 100).toFixed(2);
  const totalRub = ((amountKop + feeKop) / 100).toFixed(2);
  const description =
    `Script SDPayOutPage ${amountRub} ₽, списание ${totalRub} ₽ (комиссия ${feeRub} ₽)`.slice(0, 1000);

  const successUrl = `${publicBase}/cabinet/payout-return?success=1&payoutId=${reference}`;
  const failUrl = `${publicBase}/cabinet/payout-return?success=0&payoutId=${reference}`;
  const notifyUrl = `${publicBase}/api/payment/webhook`;

  const regSignature = buildPaygineSignature(
    [String(sector), String(amountKop), String(CURRENCY_RUB)],
    password as string,
  );

  const regPairs: [string, string][] = [
    ["sector", String(sector)],
    ["amount", String(amountKop)],
    ["currency", String(CURRENCY_RUB)],
    ["reference", reference],
    ["description", description],
  ];
  if (feeKop > 0) regPairs.push(["fee", String(feeKop)]);
  regPairs.push(["url", successUrl]);
  regPairs.push(["failurl", failUrl]);
  regPairs.push(["notify_url", notifyUrl]);
  regPairs.push(["sd_ref", sdRef]);
  regPairs.push(["mode", "1"]);
  regPairs.push(["signature", regSignature]);
  const regBody = new URLSearchParams(regPairs);

  const registerUrl = `${baseUrl}${REGISTER_PATH}`;
  const pageUrl = `${baseUrl}${SDPAYOUT_PAGE_PATH}`;
  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  console.error("[1/2] Register: POST", registerUrl);
  console.error("  amountKop:", amountKop, "feeKop:", feeKop, "sd_ref:", sdRef, "reference:", reference);

  const regController = new AbortController();
  const regT = setTimeout(() => regController.abort(), timeoutMs);
  let regRes: Response;
  let regText: string;
  try {
    regRes = await fetch(registerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regBody.toString(),
      signal: regController.signal,
    });
    regText = await regRes.text();
  } catch (e) {
    clearTimeout(regT);
    console.error("Register: сеть / timeout:", e);
    process.exit(1);
  }
  clearTimeout(regT);

  console.error("--- Ответ ПЦ (Register), HTTP", regRes.status, "---");
  console.error(regText);
  console.error("--- конец Register ---");

  if (!regRes.ok) {
    console.error("Register: HTTP ошибка");
    process.exit(1);
  }

  const trimmed = regText.trim();
  const numericId = /^\d+$/.test(trimmed) ? trimmed : null;
  const idMatch = regText.match(/<id>(\d+)<\/id>/i);
  const orderId = numericId ?? idMatch?.[1];
  if (!orderId) {
    const errCode = regText.match(/<code>([^<]+)<\/code>/i)?.[1];
    const errDesc = regText.match(/<description>([^<]*)<\/description>/i)?.[1];
    console.error("Register: нет order id. code:", errCode ?? "—", "description:", errDesc ?? "—");
    process.exit(1);
  }

  console.error("  orderId:", orderId);

  const pageSignature = buildPaygineSignature([String(sector), String(orderId), sdRef], password as string);
  const pageBody = new URLSearchParams({
    sector: String(sector),
    id: String(orderId),
    sd_ref: sdRef,
    signature: pageSignature,
  });

  console.error("[2/2] SDPayOutPage: POST", pageUrl);
  console.error("  Тело: sector, id, sd_ref, signature (без pan — окно карты должно отдать сам Paygine).");

  const pageController = new AbortController();
  const pageT = setTimeout(() => pageController.abort(), timeoutMs);
  let pageRes: Response;
  let pageText: string;
  try {
    pageRes = await fetch(pageUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: pageBody.toString(),
      signal: pageController.signal,
    });
    pageText = await pageRes.text();
  } catch (e) {
    clearTimeout(pageT);
    console.error("SDPayOutPage: сеть / timeout:", e);
    process.exit(1);
  }
  clearTimeout(pageT);

  console.error("--- Ответ ПЦ (SDPayOutPage), HTTP", pageRes.status, "---");
  console.error(pageText);
  console.error("--- конец SDPayOutPage ---");

  const snippet = extractHtmlErrorSnippet(pageText);
  if (snippet) {
    console.error(">>> Сообщение со страницы Paygine (выжимка):", snippet);
  }

  const xmlCode = pageText.match(/<code>\s*([^<]+)\s*<\/code>/i)?.[1]?.trim();
  const xmlDesc = pageText.match(/<description>\s*([^<]*)\s*<\/description>/i)?.[1]?.trim();
  if (xmlCode) {
    console.error(">>> XML в ответе: code=", xmlCode, xmlDesc ? `description=${xmlDesc}` : "");
  }

  const looksLikeForm =
    /input[^>]+name=["']?pan/i.test(pageText) || /card.*number/i.test(pageText) || /номер.*карт/i.test(pageText);
  const looksLikeError = /form-error|Упс|что-то пошло не так|не поддерживает операцию/i.test(pageText);

  if (looksLikeError && !looksLikeForm) {
    console.error(
      ">>> Диагноз: ПЦ вернул страницу ошибки до формы карты — обычно договор/сектор (SDPayOutPage не включён), не отсутствие PAN.",
    );
    console.error(">>> Действия: ЛК Paygine по orderId выше + поддержка Paygine с текстом ошибки и номером заказа.");
  } else if (!looksLikeForm && !looksLikeError) {
    console.error(
      ">>> Ответ не похож ни на форму карты, ни на типовую ошибку enigma — смотрите полный HTML выше (редирект, другой шаблон).",
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: pageRes.ok && looksLikeForm && !looksLikeError,
        orderId,
        reference,
        httpStatus: pageRes.status,
        payginePageSnippet: snippet,
        looksLikeCardForm: looksLikeForm,
        looksLikeErrorPage: looksLikeError,
        hint: looksLikeError
          ? "Ошибка Paygine до ввода карты — см. выжимку и HTML."
          : looksLikeForm
            ? "В ответе есть признаки формы карты."
            : "Проверьте тело ответа выше.",
      },
      null,
      2,
    ),
  );

  process.exit(pageRes.ok && looksLikeForm && !looksLikeError ? 0 : 1);
}

main();
