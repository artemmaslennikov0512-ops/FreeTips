/**
 * POST /api/payment/webhook
 * Приём вебхуков от платёжного провайдера (Paygine): подпись, маппинг статусов, обновление Transaction.
 */

import { NextRequest } from "next/server";
import { postPaygineWebhook } from "@/lib/payment/paygine-webhook-route";

export async function POST(request: NextRequest) {
  return postPaygineWebhook(request, "/api/payment/webhook");
}
