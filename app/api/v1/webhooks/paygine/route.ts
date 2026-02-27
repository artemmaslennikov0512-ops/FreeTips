/**
 * POST /api/v1/webhooks/paygine
 * Тот же приём уведомлений Paygine, что и /api/payment/webhook.
 * URL для ЛК Paygine: https://ваш-домен/api/v1/webhooks/paygine
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaymentGateway } from "@/lib/payment/stub-gateway";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getClientIP, checkRateLimitByIP, WEBHOOK_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { readTextWithLimit, MAX_BODY_SIZE_WEBHOOK } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const rateLimit = checkRateLimitByIP(ip, WEBHOOK_RATE_LIMIT);
  if (!rateLimit.allowed) {
    logSecurity("payment.webhook.rate_limit", { requestId, ip });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const bodyResult = await readTextWithLimit(request, MAX_BODY_SIZE_WEBHOOK);
  if (!bodyResult.ok) return bodyResult.response;
  const rawBody = bodyResult.text;
  const signature = request.headers.get("X-Webhook-Signature") ?? request.headers.get("X-Signature") ?? null;

  const gateway = getPaymentGateway();
  try {
    const { ok } = await gateway.handleWebhook(rawBody, signature);

    if (!ok) {
      logSecurity("payment.webhook.invalid_signature", { requestId, ip });
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    logSecurity("payment.webhook.received", { requestId, ip });
    return new NextResponse("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    logError("payment.webhook.error", error, { requestId, ip });
    // Всегда 200, чтобы Paygine не считал уведомление неуспешным и не показывал ошибку пользователю
    return new NextResponse("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
}
