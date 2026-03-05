/**
 * Клиент Paygine по документу «Интеграция с ПЦ» (Оглавление1.txt).
 * В приложении: пополнение только картой (Register → SDPayIn). Purchase/PurchaseSBP используются скриптами.
 * Порядок параметров и подпись — Таблицы 1, 2, 44 и Приложение №2.
 */

import { buildPaygineSignature } from "./signature";

// Базовый URL для запросов — до /webapi включительно. Тест: https://test.paygine.com/webapi , прод: https://pay.paygine.com/webapi
const TEST_BASE_URL = "https://test.paygine.com/webapi";
const PROD_BASE_URL = "https://pay.paygine.com/webapi";
const ALLOWED_HOSTS = ["test.paygine.com", "pay.paygine.com"];

export function getPaygineBaseUrl(): string {
  const raw = process.env.PAYGINE_BASE_URL?.trim();
  if (!raw) return TEST_BASE_URL;
  const url = raw.replace(/\/$/, "");
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.includes(host)) return TEST_BASE_URL;
    // Если указан только хост (без /webapi), дополняем
    const path = u.pathname.replace(/\/+$/, "") || "";
    if (path === "" || path === "/") return `${u.origin}/webapi`;
    return url;
  } catch {
    /* invalid URL */
  }
  return TEST_BASE_URL;
}

/** Прод-контур: true, если используется pay.paygine.com. */
export function isPaygineProduction(): boolean {
  return getPaygineBaseUrl() === PROD_BASE_URL;
}

export type PaygineConfig = {
  sector: string;
  password: string;
  baseUrl?: string;
};

export type RegisterParams = {
  amount: number;
  currency: number;
  reference: string;
  description: string;
  /** Комиссия в копейках; взимается с плательщика дополнительно, amount зачисляется на кубышку, fee не поступает на баланс кубышки (документ Таблица 1). */
  fee?: number;
  url?: string;
  failurl?: string;
  notify_url?: string;
  sd_ref?: string;
};

export type RegisterResult =
  | { ok: true; orderId: number }
  | { ok: false; code?: string; description?: string };

/**
 * webapi/Register. Таблица 1.
 * Подпись: только sector, amount, currency, password — в указанном порядке (Приложение №2).
 * Параметры в теле запроса — в порядке таблицы: обязательные, затем необязательные, signature.
 */
export async function registerOrder(
  config: PaygineConfig,
  params: RegisterParams
): Promise<RegisterResult> {
  const { sector, password } = config;

  // Подпись строго по документу: sector, amount, currency, password
  const signature = buildPaygineSignature(
    [String(sector), String(params.amount), String(params.currency)],
    password
  );

  // Порядок параметров по документу (Таблица 1): sector, amount, currency, reference, description, необяз. (fee, url, failurl, notify_url, sd_ref), signature
  const pairs: [string, string][] = [
    ["sector", String(sector)],
    ["amount", String(params.amount)],
    ["currency", String(params.currency)],
    ["reference", params.reference],
    ["description", params.description],
  ];
  if (params.fee != null && params.fee > 0) pairs.push(["fee", String(params.fee)]);
  if (params.url) pairs.push(["url", params.url]);
  if (params.failurl) pairs.push(["failurl", params.failurl]);
  if (params.notify_url) pairs.push(["notify_url", params.notify_url]);
  if (params.sd_ref) pairs.push(["sd_ref", params.sd_ref]);
  pairs.push(["mode", "1"]); // как в рабочем скрипте sd-topup-card-auto
  pairs.push(["signature", signature]);

  const body = new URLSearchParams(pairs);

  const res = await fetch(`${getPaygineBaseUrl()}/Register`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  const trimmed = text.trim();
  if (!res.ok) {
    return { ok: false, description: trimmed.slice(0, 500) || `HTTP ${res.status}` };
  }

  // Ответ может быть: число (order id) или XML <id>...</id>
  const numericId = /^\d+$/.test(trimmed)
    ? parseInt(trimmed, 10)
    : null;
  if (numericId !== null && Number.isFinite(numericId)) {
    return { ok: true, orderId: numericId };
  }

  const idMatch = text.match(/<id>(\d+)<\/id>/);
  if (idMatch) {
    return { ok: true, orderId: parseInt(idMatch[1], 10) };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  return { ok: false, code: errCode ?? undefined, description: (errDesc ?? trimmed).slice(0, 500) };
}

/**
 * webapi/Order — получение информации по заказу (Таблица 15).
 * Подпись: sector, id, reference, password (при запросе по id можно sector, id, password).
 */
export type OrderStatusResult =
  | { ok: true; orderState: string }
  | { ok: false; code?: string; description?: string };

export async function getOrderStatus(
  config: PaygineConfig,
  orderId: number
): Promise<OrderStatusResult> {
  const { sector, password } = config;
  const signParts = [String(sector), String(orderId)];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["id", String(orderId)],
    ["mode", "1"],
    ["signature", signature],
  ]);

  const res = await fetch(`${getPaygineBaseUrl()}/Order`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const orderStateMatch = text.match(/<order_state>([^<]*)<\/order_state>/i);
  if (orderStateMatch) {
    return { ok: true, orderState: orderStateMatch[1].trim().toUpperCase() };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
}

export type PaygineFormParams = Record<string, string>;

/**
 * webapi/Purchase — оплата по карте (Таблица 2).
 * Редирект на платёжные страницы ПЦ. Сумма и url/failurl берутся из Заказа (Register).
 * Подпись: sector, id, payer_id, pan_token_sha256, password. Без payer_id/pan_token_sha256: sector, id, password.
 */
export function buildPurchaseFormParams(
  config: PaygineConfig,
  opts: { orderId: number }
): PaygineFormParams {
  const { sector, password } = config;
  const signParts = [String(sector), String(opts.orderId)];
  const signature = buildPaygineSignature(signParts, password);
  return {
    sector: String(sector),
    id: String(opts.orderId),
    signature,
  };
}

/** webapi/PurchaseSBP — подпись как у Purchase (sector, id, password). */
export function buildPurchaseSBPFormParams(
  config: PaygineConfig,
  opts: { orderId: number }
): PaygineFormParams {
  return buildPurchaseFormParams(config, opts);
}

export function getPurchaseEndpoint(): string {
  return `${getPaygineBaseUrl()}/Purchase`;
}

export function getPurchaseSBPEndpoint(): string {
  return `${getPaygineBaseUrl()}/PurchaseSBP`;
}

/** Валюта RUB для SDPayIn (строка, как в скрипте). */
const CURRENCY_RUB_STR = "643";

/**
 * Оплата картой через SDPayIn (как в рабочем скрипте sd-topup-card-auto / sd-fund-order-card).
 * POST на webapi/b2puser/sd-services/SDPayIn.
 * Подпись: sector, id, amount, currency, sd_ref, password (Приложение №2).
 */
export type SDPayInFormParams = {
  orderId: number;
  amountKop: number;
  sdRef: string;
  url: string;
  failurl: string;
};

export function buildSDPayInFormParams(
  config: PaygineConfig,
  opts: SDPayInFormParams
): PaygineFormParams {
  const { sector, password } = config;
  const signParts = [
    String(sector),
    String(opts.orderId),
    String(opts.amountKop),
    CURRENCY_RUB_STR,
    opts.sdRef,
  ];
  const signature = buildPaygineSignature(signParts, password);
  return {
    sector: String(sector),
    id: String(opts.orderId),
    amount: String(opts.amountKop),
    currency: CURRENCY_RUB_STR,
    sd_ref: opts.sdRef,
    url: opts.url,
    failurl: opts.failurl,
    signature,
  };
}

export function getSDPayInEndpoint(): string {
  return `${getPaygineBaseUrl()}/b2puser/sd-services/SDPayIn`;
}

// --- Выплаты СБП по документу Оглавление1 (Таблицы 53, 54) ---
// webapi/sbp/SBPCreditPrecheck и webapi/sbp/SBPCredit. Сначала Register (получить id заказа).

/**
 * webapi/sbp/SBPCreditPrecheck — проверка возможности выплаты через СБП (Таблица 53).
 * Обязательно: id — из Register. Подпись: sector, id, recipientBankId, phone, password.
 * Параметр банка в документе: recipientBankId (не bank_id).
 */
export type SBPCreditPrecheckParams = {
  orderId: number; // id заказа из Register
  recipientBankId: string;
  phone: string;
};

export type SBPCreditPrecheckResult =
  | { ok: true; precheck_id: string }
  | { ok: false; code?: string; description?: string };

export async function sbpCreditPrecheck(
  config: PaygineConfig,
  params: SBPCreditPrecheckParams
): Promise<SBPCreditPrecheckResult> {
  const { sector, password } = config;
  const signParts = [
    String(sector),
    String(params.orderId),
    params.recipientBankId,
    params.phone,
  ];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["id", String(params.orderId)],
    ["recipientBankId", params.recipientBankId],
    ["phone", params.phone],
    ["signature", signature],
  ]);

  const res = await fetch(`${getPaygineBaseUrl()}/sbp/SBPCreditPrecheck`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const precheckId = text.match(/<precheck_id>([^<]+)<\/precheck_id>/i)?.[1]?.trim();
  if (precheckId) {
    return { ok: true, precheck_id: precheckId };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
}

/**
 * webapi/sbp/SBPCredit — B2C выплаты через СБП (Таблица 54).
 * Подпись: sector, id, precheck_id, password. В документе параметра description нет.
 */
export type SBPCreditParams = {
  orderId: number;
  precheck_id: string;
};

export type SBPCreditResult =
  | { ok: true; operationId?: string }
  | { ok: false; code?: string; description?: string };

export async function sbpCredit(
  config: PaygineConfig,
  params: SBPCreditParams
): Promise<SBPCreditResult> {
  const { sector, password } = config;
  const signParts = [String(sector), String(params.orderId), params.precheck_id];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["id", String(params.orderId)],
    ["precheck_id", params.precheck_id],
    ["signature", signature],
  ]);

  const res = await fetch(`${getPaygineBaseUrl()}/sbp/SBPCredit`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  if (errCode || errDesc) {
    return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
  }

  const operationId = text.match(/<id>(\d+)<\/id>/i)?.[1];
  return { ok: true, operationId };
}

// --- Перевод между кубышками (SDRelocateFunds) и вывод на карту (SDPayOut) ---
// Для перевода: Register (новый заказ) → SDRelocateFunds(id, from_sd_ref, to_sd_ref).

export type SDRelocateFundsParams = {
  orderId: number;
  fromSdRef: string;
  toSdRef: string;
};

export type SDRelocateFundsResult =
  | { ok: true }
  | { ok: false; code?: string; description?: string };

/**
 * webapi/b2puser/sd-services/SDRelocateFunds.
 * Перевод с кубышки from_sd_ref на to_sd_ref. orderId — от нового Register (заказ на перевод), не от заказа на пополнение.
 * Подпись: sector, id, from_sd_ref, to_sd_ref, password (как в sd-relocate.ts).
 */
export async function sdRelocateFunds(
  config: PaygineConfig,
  params: SDRelocateFundsParams
): Promise<SDRelocateFundsResult> {
  const { sector, password } = config;
  const signParts = [
    String(sector),
    String(params.orderId),
    params.fromSdRef,
    params.toSdRef,
  ];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["id", String(params.orderId)],
    ["from_sd_ref", params.fromSdRef],
    ["to_sd_ref", params.toSdRef],
    ["signature", signature],
  ]);

  const res = await fetch(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDRelocateFunds`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const approved =
    text.includes("<state>APPROVED</state>") || text.includes("<order_state>COMPLETED</order_state>");
  if (approved) return { ok: true };

  const code = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const desc = text.match(/<description>([^<]*)<\/description>/)?.[1]?.trim();
  return { ok: false, code, description: (desc ?? text).slice(0, 500) };
}

export type SDPayOutParams = {
  sdRef: string;
  pan: string; // номер карты без пробелов
  amountKop: number;
  description?: string;
  feeKop?: number;
};

export type SDPayOutResult =
  | { ok: true; operationId?: string }
  | { ok: false; code?: string; description?: string };

const CURRENCY_RUB_SDPAYOUT = "643";

/**
 * webapi/b2puser/sd-services/SDPayOut — вывод с кубышки на карту.
 *
 * По документации Paygine (апи.md, Приложение №2):
 * - Метод: POST, Content-Type: application/x-www-form-urlencoded.
 * - URL: {PAYGINE_BASE_URL}/b2puser/sd-services/SDPayOut (baseUrl уже содержит /webapi).
 * - Параметры запроса (порядок как в апи.md): sector, sd_ref, pan, amount, currency, signature, description, fee (опц.).
 * - Подпись: строка значений в порядке sector, pan, amount, currency, sd_ref + password →
 *   SHA256(UTF-8), hex (lowercase), Base64(hex). Соответствует scripts/utils/sd-payout.ts.
 */
export async function sdPayOut(
  config: PaygineConfig,
  params: SDPayOutParams
): Promise<SDPayOutResult> {
  const { sector, password } = config;
  const pan = params.pan.replace(/\s/g, "");
  const amountStr = String(params.amountKop);
  const signParts = [String(sector), pan, amountStr, CURRENCY_RUB_SDPAYOUT, params.sdRef];
  const signature = buildPaygineSignature(signParts, password);

  // Порядок по документу: sector, sd_ref, pan, amount, currency, signature, затем description, fee
  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["sd_ref", params.sdRef],
    ["pan", pan],
    ["amount", amountStr],
    ["currency", CURRENCY_RUB_SDPAYOUT],
    ["signature", signature],
  ]);
  body.set("description", (params.description ?? "Payout").trim().slice(0, 1000));
  if (params.feeKop != null && params.feeKop > 0) body.set("fee", String(params.feeKop));

  const res = await fetch(`${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOut`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const errCode = text.match(/<code>\s*([^<]+)\s*<\/code>/)?.[1]?.trim();
  if (errCode && errCode !== "0" && errCode !== "RQ00000") {
    const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1]?.trim();
    return { ok: false, code: errCode, description: (errDesc ?? text).slice(0, 500) };
  }

  const operationId = text.match(/<id>(\d+)<\/id>/)?.[1] ?? text.match(/<order_id>(\d+)<\/order_id>/)?.[1];
  return { ok: true, operationId };
}

/**
 * SDPayOutPage — вывод с кубышки на карту с редиректом на платёжные страницы ПЦ (карта вводится на Paygine).
 * Сначала вызывается webapi/Register (amount, currency, sd_ref, url, failurl, fee); затем форма POST на SDPayOutPage.
 * Подпись SDPayOutPage по апи.md Таблица 15: sector, id, …, sd_ref, … → для минимального набора: sector, id, sd_ref, password.
 */
export function buildSDPayOutPageFormParams(
  config: PaygineConfig,
  opts: { orderId: number; sdRef: string }
): PaygineFormParams {
  const { sector, password } = config;
  const signParts = [String(sector), String(opts.orderId), opts.sdRef];
  const signature = buildPaygineSignature(signParts, password);
  return {
    sector: String(sector),
    id: String(opts.orderId),
    sd_ref: opts.sdRef,
    signature,
  };
}

export function getSDPayOutPageEndpoint(): string {
  return `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOutPage`;
}

// --- Выплаты СБП через sd-services (webapi/b2puser/sd-services) ---
// SDPayOutSBPPrecheck → SDPayOutSBP (без Register). Параметры: phone, bank_id, amount.

const SD_SERVICES_PATH = "b2puser/sd-services";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type SDGetBalanceResult =
  | { ok: true; balanceKop: number }
  | { ok: false; code?: string; description?: string };

/**
 * Баланс кубышки (SDGetBalance). Таблица 22, подпись: sector, sd_ref, password.
 */
export async function sdGetBalance(
  config: PaygineConfig,
  params: { sdRef: string }
): Promise<SDGetBalanceResult> {
  const { sector, password } = config;
  const sdRef = params.sdRef.trim();
  const signParts = [String(sector), sdRef];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["sd_ref", sdRef],
    ["signature", signature],
  ]);

  const timeoutMs = Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  let text: string;
  try {
    res = await fetch(`${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDGetBalance`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      description: isAbort ? "Timeout" : err instanceof Error ? err.message : "Request failed",
    };
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const balanceMatch = text.match(/<balance>(\d+)<\/balance>/);
  if (balanceMatch) {
    const balanceKop = Number(balanceMatch[1]);
    return { ok: true, balanceKop };
  }

  const codeMatch = text.match(/<code>\s*([^<]+)\s*<\/code>/);
  const descMatch = text.match(/<description>\s*([^<]*)\s*<\/description>/);
  return {
    ok: false,
    code: codeMatch?.[1]?.trim(),
    description: (descMatch?.[1] ?? text).trim().slice(0, 500) || undefined,
  };
}

export type SDPayOutSBPPrecheckParams = {
  phone: string;
  bank_id: string;
  amount: number;
};

export type SDPayOutSBPPrecheckResult =
  | { ok: true; precheck_id: string }
  | { ok: false; code?: string; description?: string };

/**
 * webapi/b2puser/sd-services/SDPayOutSBPPrecheck.
 * Подпись: sector, phone, bank_id, amount, password.
 */
export async function sdPayOutSBPPrecheck(
  config: PaygineConfig,
  params: SDPayOutSBPPrecheckParams
): Promise<SDPayOutSBPPrecheckResult> {
  const { sector, password } = config;
  const signParts = [
    String(sector),
    params.phone,
    params.bank_id,
    String(params.amount),
  ];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["phone", params.phone],
    ["bank_id", params.bank_id],
    ["amount", String(params.amount)],
    ["signature", signature],
  ]);

  const res = await fetch(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOutSBPPrecheck`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const precheckId = text.match(/<precheck_id>([^<]+)<\/precheck_id>/i)?.[1]?.trim();
  if (precheckId) {
    return { ok: true, precheck_id: precheckId };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
}

export type SDPayOutSBPParams = {
  precheck_id: string;
};

export type SDPayOutSBPResult =
  | { ok: true; operationId?: string }
  | { ok: false; code?: string; description?: string };

/**
 * webapi/b2puser/sd-services/SDPayOutSBP.
 * Подпись: sector, precheck_id, password.
 */
export async function sdPayOutSBP(
  config: PaygineConfig,
  params: SDPayOutSBPParams
): Promise<SDPayOutSBPResult> {
  const { sector, password } = config;
  const signParts = [String(sector), params.precheck_id];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["precheck_id", params.precheck_id],
    ["signature", signature],
  ]);

  const res = await fetch(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOutSBP`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  if (errCode || errDesc) {
    return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
  }

  const operationId = text.match(/<id>(\d+)<\/id>/i)?.[1];
  return { ok: true, operationId };
}
