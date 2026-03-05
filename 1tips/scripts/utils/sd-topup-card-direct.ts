/**
 * Пополнение кубышки картой без браузера: Register → один POST на SDPayIn с данными карты.
 * Повторяет то, что делает форма на странице Paygine: те же action, метод и имена полей (pan, date, code).
 *
 * Имена полей карты взяты из формы Paygine (см. DISCOVER=1 в sd-topup-card-auto.ts).
 * Если ПЦ начнёт возвращать ошибку подписи или «неверный запрос» — форма могла измениться, запустите
 * DISCOVER=1 npx tsx scripts/sd-topup-card-auto.ts <amount_kop> и проверьте form.inputs.
 *
 * Запуск: npx tsx scripts/utils/sd-topup-card-direct.ts <amount_kop>
 * Параметры и карта — из scripts/.env (PAYGINE_*, PAYGINE_TEST_PAN, PAYGINE_TEST_EXPIRY, PAYGINE_TEST_CVC).
 */

import { loadScriptsEnv } from "./load-env";
import { saveLastTopup } from "./last-topup";
import { createHash } from "crypto";

loadScriptsEnv();

const REGISTER_PATH = "/webapi/Register";
const SDPAYIN_PATH = "/webapi/b2puser/sd-services/SDPayIn";
const CURRENCY_RUB = 643;
const CURRENCY_STR = "643";
const DEFAULT_TIMEOUT_MS = 30_000;
const PAY_WAIT_MS = 60_000;

function computeSignature(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const amountArg = process.argv[2]?.trim();
  if (!amountArg) {
    console.error("Usage: npx tsx scripts/utils/sd-topup-card-direct.ts <amount_kop>");
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
  const successUrl = process.env.REGISTER_URL?.trim() || "https://example.com/pay/success";
  const failUrl = process.env.REGISTER_FAILURL?.trim() || "https://example.com/pay/fail";

  let expdate = process.env.PAYGINE_TEST_EXPIRY?.trim() ?? "";
  const pan = process.env.PAYGINE_TEST_PAN?.replace(/\s/g, "") ?? "";
  const cvc = process.env.PAYGINE_TEST_CVC?.trim() ?? "";

  const missing: string[] = [];
  if (!baseUrl) missing.push("PAYGINE_BASE_URL");
  if (!sector) missing.push("PAYGINE_SECTOR");
  if (!password) missing.push("PAYGINE_PASSWORD");
  if (!sdRef) missing.push("PAYGINE_SD_REF");
  if (!pan || pan.length < 8) missing.push("PAYGINE_TEST_PAN");
  if (!expdate) missing.push("PAYGINE_TEST_EXPIRY");
  if (!cvc) missing.push("PAYGINE_TEST_CVC");
  if (missing.length > 0) {
    console.error("Не задано в scripts/.env:", missing.join(", "));
    process.exit(1);
  }

  if (expdate.length === 4 && !expdate.includes("/")) {
    expdate = `${expdate.slice(0, 2)}/${expdate.slice(2)}`;
  }
  const dateValue = expdate.replace("/", "");

  const baseUrlStr = baseUrl as string;
  const sectorStr = sector as string;
  const passwordStr = password as string;
  const sdRefStr = sdRef as string;

  const reference = `topup-direct-${Date.now()}`;
  const regSignature = computeSignature([sectorStr, String(amountKop), String(CURRENCY_RUB)], passwordStr);
  const regBody = new URLSearchParams({
    sector: sectorStr,
    amount: String(amountKop),
    currency: String(CURRENCY_RUB),
    reference,
    description: `Пополнение ${sdRefStr}`.slice(0, 1000),
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

  const paySignature = computeSignature(
    [sectorStr, orderId, String(amountKop), CURRENCY_STR, sdRefStr],
    passwordStr,
  );

  const payBody = new URLSearchParams({
    sector: sectorStr,
    id: orderId,
    amount: String(amountKop),
    currency: CURRENCY_STR,
    sd_ref: sdRefStr,
    url: successUrl,
    failurl: failUrl,
    signature: paySignature,
    action: "pay",
    pan,
    date: dateValue,
    code: cvc,
  });

  const payUrl = `${baseUrlStr}${SDPAYIN_PATH}`;
  const payController = new AbortController();
  const payTimeoutId = setTimeout(() => payController.abort(), PAY_WAIT_MS);

  let payRes: Response;
  let payText: string;
  try {
    payRes = await fetch(payUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payBody.toString(),
      signal: payController.signal,
      redirect: "manual",
    });
    payText = await payRes.text();
  } catch (err) {
    clearTimeout(payTimeoutId);
    console.error("SDPayIn request failed:", err);
    process.exit(1);
  }
  clearTimeout(payTimeoutId);

  const location = payRes.headers.get("location") ?? "";
  const okByRedirect = payRes.status >= 300 && payRes.status < 400 && (location.includes("success") || (location.includes("example.com") && !location.includes("fail")));
  const okByBody = payText.includes("success") || (payText.includes("APPROVED") || payText.includes("COMPLETED"));
  const errInBody = payText.match(/<code>\s*([^<]+)\s*<\/code>/)?.[1] || payText.match(/reason=([^&\s]+)/)?.[1];
  const ok = okByRedirect || (payRes.ok && okByBody);

  let redirectParams: Record<string, string> | undefined;
  if (location && location.includes("?")) {
    const q = location.includes("?") ? location.slice(location.indexOf("?") + 1) : "";
    redirectParams = Object.fromEntries(
      q.split("&").map((p) => {
        const [k, v] = p.split("=");
        return [k ?? "", decodeURIComponent(v ?? "")];
      }),
    );
  }

  if (ok) {
    saveLastTopup({
      pan,
      amountKop,
      orderId,
      timestamp: new Date().toISOString(),
    });
  }

  const reasonHint =
    redirectParams?.code !== undefined
      ? `code=${redirectParams.code} (1=успех, 2=срок карты, 4=отклонено эмитентом, 6=недостаточно средств, 9=дубль, 17=заказ просрочен, 109=подпись, 118=заказ не найден, 127=отказ плательщика, 167=сектор не поддерживает)`
      : undefined;

  console.log(JSON.stringify({
    ok: !!ok,
    orderId,
    amountKop,
    payStatus: payRes.status,
    redirect: location || undefined,
    redirectParams: redirectParams ?? undefined,
    paygineCode: errInBody,
    reasonHint,
    hint: !ok && !errInBody && !redirectParams?.code ? "ПЦ мог вернуть HTML или требовать 3DS. Проверьте redirectParams и DISCOVER=1 для полей формы." : undefined,
  }, null, 2));

  process.exit(ok ? 0 : 1);
}

main();
