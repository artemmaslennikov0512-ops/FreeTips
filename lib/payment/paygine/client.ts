/**
 * Клиент Paygine по документу «Интеграция с ПЦ» (Оглавление1.txt).
 * В приложении: пополнение картой (Register → SDPayIn).
 * Порядок параметров и подпись — Таблицы 1, 2, 44 и Приложение №2.
 *
 * Все запросы к API Paygine идут через ограниченный параллелизм по каналам:
 * - tip (пополнения/переливы/статусы),
 * - payout (выводы).
 * Это уменьшает хвосты в пике и не даёт одному типу операций полностью забить другой.
 */

import { buildPaygineSignature } from "./signature";
import { logWarn } from "@/lib/logger";

type PaygineChannel = "tip" | "payout";

type ChannelLimiterState = {
  active: number;
  waiters: Array<() => void>;
};

const channelState: Record<PaygineChannel, ChannelLimiterState> = {
  tip: { active: 0, waiters: [] },
  payout: { active: 0, waiters: [] },
};

/**
 * Параллелизм внешних вызовов Paygine.
 * Дефолт: 4 (можно мгновенно откатить в env до 1 без правок кода).
 */
function getPaygineApiConcurrency(): number {
  const raw = process.env.PAYGINE_API_CONCURRENCY?.trim();
  if (!raw) return 4;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 16 ? n : 4;
}

function getPaygineChannelConcurrency(channel: PaygineChannel): number {
  if (channel === "payout") {
    const raw = process.env.PAYGINE_API_CONCURRENCY_PAYOUT?.trim();
    if (!raw) return 1;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= 16 ? n : 1;
  }
  const raw = process.env.PAYGINE_API_CONCURRENCY_TIP?.trim();
  if (!raw) return getPaygineApiConcurrency();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 && n <= 16 ? n : getPaygineApiConcurrency();
}

/** Выполняет запросы к Paygine с ограниченным параллелизмом по каналу. */
async function withPaygineChannel<T>(channel: PaygineChannel, fn: () => Promise<T>): Promise<T> {
  const cap = getPaygineChannelConcurrency(channel);
  const state = channelState[channel];
  if (state.active >= cap) {
    await new Promise<void>((resolve) => state.waiters.push(resolve));
  }
  state.active += 1;
  try {
    return await fn();
  } finally {
    state.active = Math.max(0, state.active - 1);
    const next = state.waiters.shift();
    if (next) next();
  }
}

/** Совместимость: по умолчанию канал tip. */
async function withPaygineSerial<T>(fn: () => Promise<T>): Promise<T> {
  return withPaygineChannel("tip", fn);
}

// Базовый URL для запросов — до /webapi включительно. Тест: https://test.paygine.com/webapi , прод: https://pay.paygine.com/webapi
const TEST_BASE_URL = "https://test.paygine.com/webapi";
const ALLOWED_HOSTS = ["test.paygine.com", "pay.paygine.com"];

function getPaygineBaseUrl(): string {
  const raw = process.env.PAYGINE_BASE_URL?.trim();
  if (!raw) return TEST_BASE_URL;
  const url = raw.replace(/\/$/, "");
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.includes(host)) return TEST_BASE_URL;
    let path = u.pathname.replace(/\/+$/, "") || "";
    /** Ошибка в .env или старые скрипты: .../webapi/webapi → один /webapi */
    while (path.includes("/webapi/webapi")) {
      path = path.replace(/\/webapi\/webapi/g, "/webapi");
    }
    if (path === "" || path === "/") return `${u.origin}/webapi`;
    return `${u.origin}${path}`;
  } catch {
    /* invalid URL */
  }
  return TEST_BASE_URL;
}

type PaygineConfig = {
  sector: string;
  password: string;
  baseUrl?: string;
};

type RegisterParams = {
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

type RegisterResult =
  | { ok: true; orderId: number }
  | {
      ok: false;
      code?: string;
      description?: string;
      /** Первые символы тела ответа ПЦ (для логов / отладки). */
      responsePreview?: string;
    };

/**
 * webapi/Register. Таблица 1.
 * Подпись: только sector, amount, currency, password — в указанном порядке (Приложение №2).
 * Параметры в теле запроса — в порядке таблицы: обязательные, затем необязательные, signature.
 */
export async function registerOrder(
  config: PaygineConfig,
  params: RegisterParams
): Promise<RegisterResult> {
  return withPaygineSerial(async () => {
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

  const fetched = await fetchPaygineFormText(`${getPaygineBaseUrl()}/Register`, body);
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
  const trimmed = text.trim();
  const responsePreview = text.replace(/\s+/g, " ").trim().slice(0, 1200);
  if (!res.ok) {
    return {
      ok: false,
      description: trimmed.slice(0, 500) || `HTTP ${res.status}`,
      responsePreview: responsePreview || undefined,
    };
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
  return {
    ok: false,
    code: errCode ?? undefined,
    description: (errDesc ?? trimmed).slice(0, 500),
    responsePreview: responsePreview || undefined,
  };
  });
}

/**
 * webapi/Order — получение информации по заказу (Таблица 15).
 * Подпись строго: sector, id, reference, password (reference — пустая строка, если не передаём).
 * Без reference в подписи ПЦ отвечает ошибкой; в &lt;description&gt; часто попадает description заказа (у нас — slug ссылки).
 */
type OrderStatusResult =
  | {
      ok: true;
      /** Тег <order_state> или <state> уровня заказа (до <operations>). */
      orderState: string;
      /** Статус последней релевантной операции (не REVERSE) внутри <operations> — как <state> в вебхуке. */
      operationState: string | null;
    }
  | { ok: false; code?: string; description?: string };

/**
 * В части ответов Paygine order_state приходит числом (код из таблицы: 2 = COMPLETED).
 * Без нормализации синк не считает заказ оплаченным при «2» в XML.
 */
const ORDER_STATE_NUMERIC: Record<string, string> = {
  "0": "REGISTERED",
  "1": "AUTHORIZED",
  "2": "COMPLETED",
  "3": "CANCELED",
  "4": "BLOCKED",
  "6": "EXPIRED",
  "7": "P2PAUTHORIZED",
};

export function normalizePaygineOrderStateToken(raw: string): string {
  const s = raw.trim();
  if (/^\d+$/.test(s) && ORDER_STATE_NUMERIC[s]) return ORDER_STATE_NUMERIC[s];
  const u = s.toUpperCase();
  if (u === "COMPLETE") return "COMPLETED";
  return u;
}

/**
 * Разбор ответа webapi/Order: в доке бывает и <order_state>, и формат <order><state>…</state><operations><operation><state>APPROVED</state>.
 */
export function parsePaygineOrderResponseXml(text: string): {
  orderState: string;
  operationState: string | null;
} | null {
  const orderStateRaw = text.match(/<order_state>([^<]*)<\/order_state>/i)?.[1]?.trim() ?? "";
  const beforeOps = text.split(/<operations\b/i)[0] ?? text;
  const orderLevelRaw = beforeOps.match(/<state>([^<]*)<\/state>/i)?.[1]?.trim() ?? "";

  let operationState: string | null = null;
  const opBlocks = text.match(/<operation>[\s\S]*?<\/operation>/gi) ?? [];
  for (const block of opBlocks) {
    const type = (block.match(/<type>([^<]*)<\/type>/i)?.[1] ?? "").trim().toUpperCase();
    if (type.includes("REVERSE")) continue;
    const st = block.match(/<state>([^<]*)<\/state>/i)?.[1]?.trim() ?? "";
    if (st) operationState = normalizePaygineOrderStateToken(st);
  }

  const orderStateTag = orderStateRaw ? normalizePaygineOrderStateToken(orderStateRaw) : "";
  const orderLevelState = orderLevelRaw ? normalizePaygineOrderStateToken(orderLevelRaw) : "";
  const orderState = orderStateTag || orderLevelState;
  if (!orderState && !operationState) return null;

  return {
    orderState: orderState || orderLevelState || "UNKNOWN",
    operationState,
  };
}

/** Согласовано с вебхуком (paygine-gateway): успех операции или завершённый заказ. */
export function isPaygineOrderPaidInOrderResponse(orderState: string, operationState: string | null): boolean {
  const os = orderState.toUpperCase();
  const op = (operationState ?? "").toUpperCase();
  return (
    op === "APPROVED" ||
    op === "P2PAUTHORIZED" ||
    os === "COMPLETED" ||
    os === "P2PAUTHORIZED"
  );
}

type GetOrderStatusOptions = {
  /** Номер заказа на стороне ТСП — тот же reference, что в webapi/Register (idempotencyKey чаевых). */
  reference?: string | null;
};

export async function getOrderStatus(
  config: PaygineConfig,
  orderId: number,
  options: GetOrderStatusOptions = {},
): Promise<OrderStatusResult> {
  return withPaygineSerial(async () => {
  const { sector, password } = config;
  const reference = (options.reference ?? "").trim();
  const signParts = [String(sector), String(orderId), reference];
  const signature = buildPaygineSignature(signParts, password);

  const pairs: [string, string][] = [
    ["sector", String(sector)],
    ["id", String(orderId)],
  ];
  if (reference) pairs.push(["reference", reference]);
  pairs.push(["mode", "1"], ["signature", signature]);
  const body = new URLSearchParams(pairs);

  const fetched = await fetchPaygineFormText(`${getPaygineBaseUrl()}/Order`, body);
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  const parsed = parsePaygineOrderResponseXml(text);
  if (parsed) {
    return { ok: true, orderState: parsed.orderState, operationState: parsed.operationState };
  }

  const errCode = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const errDesc = text.match(/<description>([^<]*)<\/description>/)?.[1];
  return { ok: false, code: errCode ?? undefined, description: (errDesc ?? text).slice(0, 500) };
  });
}

type PaygineFormParams = Record<string, string>;

/** Валюта RUB для SDPayIn (строка, как в скрипте). */
const CURRENCY_RUB_STR = "643";

/**
 * Оплата картой через SDPayIn (как в рабочем скрипте sd-topup-card-auto / sd-fund-order-card).
 * POST на webapi/b2puser/sd-services/SDPayIn.
 * Подпись: sector, id, amount, currency, sd_ref, password (Приложение №2).
 */
type SDPayInFormParams = {
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

// --- Перевод между кубышками (SDRelocateFunds) и вывод на карту (SDPayOut) ---
// Для перевода: Register (новый заказ) → SDRelocateFunds(id, from_sd_ref, to_sd_ref).

type SDRelocateFundsParams = {
  orderId: number;
  fromSdRef: string;
  toSdRef: string;
};

type SDRelocateFundsResult =
  | { ok: true }
  | { ok: false; code?: string; description?: string; debugBody?: string };

/**
 * webapi/b2puser/sd-services/SDRelocateFunds.
 * Перевод с кубышки from_sd_ref на to_sd_ref. orderId — от нового Register (заказ на перевод), не от заказа на пополнение.
 * Подпись: sector, id, from_sd_ref, to_sd_ref, password (как в sd-relocate.ts).
 */
export async function sdRelocateFunds(
  config: PaygineConfig,
  params: SDRelocateFundsParams
): Promise<SDRelocateFundsResult> {
  return withPaygineSerial(async () => {
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

  const fetched = await fetchPaygineFormText(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDRelocateFunds`,
    body,
  );
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
  if (!res.ok) {
    return { ok: false, description: text.slice(0, 500) || `HTTP ${res.status}` };
  }

  /** ПЦ может отдавать регистр тегов/значений иначе, чем в примерах документации. */
  const approved =
    /<state>\s*APPROVED\s*<\/state>/i.test(text) ||
    /<order_state>\s*COMPLETED\s*<\/order_state>/i.test(text);
  if (approved) return { ok: true };

  const code = text.match(/<code>([^<]+)<\/code>/)?.[1];
  const desc = text.match(/<description>([^<]*)<\/description>/)?.[1]?.trim();
  const description = (desc ?? text).slice(0, 500);
  return {
    ok: false,
    code,
    description,
    debugBody: text.slice(0, 800),
  };
  });
}

type SDPayOutParams = {
  sdRef: string;
  pan: string; // номер карты без пробелов
  amountKop: number;
  description?: string;
  feeKop?: number;
};

type SDPayOutResult =
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
  return withPaygineChannel("payout", async () => {
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

  const fetched = await fetchPaygineFormText(`${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOut`, body);
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
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
  });
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
const DEFAULT_REQUEST_ERROR = "Request failed";

function getPaygineRequestTimeoutMs(): number {
  return Number(process.env.PAYGINE_REQUEST_TIMEOUT_MS) || DEFAULT_REQUEST_TIMEOUT_MS;
}

async function fetchPaygineFormText(
  url: string,
  body: URLSearchParams,
): Promise<
  | { ok: true; res: Response; text: string }
  | { ok: false; description: string; timeout: boolean }
> {
  const timeoutMs = getPaygineRequestTimeoutMs();
  const endpointPath = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: true, res, text };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (isAbort) {
      logWarn("paygine.request.timeout", {
        endpoint: endpointPath,
        timeoutMs,
      });
    }
    return {
      ok: false,
      timeout: isAbort,
      description: isAbort ? `Timeout after ${timeoutMs}ms` : err instanceof Error ? err.message : DEFAULT_REQUEST_ERROR,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

type SDGetBalanceResult =
  | { ok: true; balanceKop: number }
  | { ok: false; code?: string; description?: string };

/**
 * Баланс кубышки (SDGetBalance). Таблица 22, подпись: sector, sd_ref, password.
 */
export async function sdGetBalance(
  config: PaygineConfig,
  params: { sdRef: string }
): Promise<SDGetBalanceResult> {
  return withPaygineSerial(async () => {
  const { sector, password } = config;
  const sdRef = params.sdRef.trim();
  const signParts = [String(sector), sdRef];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["sd_ref", sdRef],
    ["signature", signature],
  ]);

  const fetched = await fetchPaygineFormText(`${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDGetBalance`, body);
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;

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
  });
}

type SDPayOutSBPPrecheckParams = {
  phone: string;
  bank_id: string;
  amount: number;
};

type SDPayOutSBPPrecheckResult =
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
  return withPaygineChannel("payout", async () => {
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

  const fetched = await fetchPaygineFormText(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOutSBPPrecheck`,
    body,
  );
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
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
  });
}

type SDPayOutSBPParams = {
  precheck_id: string;
};

type SDPayOutSBPResult =
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
  return withPaygineChannel("payout", async () => {
  const { sector, password } = config;
  const signParts = [String(sector), params.precheck_id];
  const signature = buildPaygineSignature(signParts, password);

  const body = new URLSearchParams([
    ["sector", String(sector)],
    ["precheck_id", params.precheck_id],
    ["signature", signature],
  ]);

  const fetched = await fetchPaygineFormText(
    `${getPaygineBaseUrl()}/${SD_SERVICES_PATH}/SDPayOutSBP`,
    body,
  );
  if (!fetched.ok) {
    return { ok: false, description: fetched.description.slice(0, 500) };
  }
  const { res, text } = fetched;
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
  });
}
