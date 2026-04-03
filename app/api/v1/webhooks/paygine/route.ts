/**
 * POST /api/v1/webhooks/paygine
 * Тот же приём уведомлений Paygine, что и /api/payment/webhook.
 * URL для ЛК Paygine: https://ваш-домен/api/v1/webhooks/paygine
 */

import { NextRequest } from "next/server";
import { postPaygineWebhook } from "@/lib/payment/paygine-webhook-route";

export async function POST(request: NextRequest) {
  return postPaygineWebhook(request, "/api/v1/webhooks/paygine");
}
