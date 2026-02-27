/**
 * POST /api/payment/webhook
 * Приём вебхуков от платёжного провайдера.
 * Заглушка: всегда 200. Реальная реализация — проверка подписи, маппинг статусов, обновление Transaction.
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
    // Возвращаем 200, чтобы Paygine не показывал ошибку пользователю и не слал повторные попытки
    return new NextResponse("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
}
