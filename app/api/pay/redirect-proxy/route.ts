/**
 * POST /api/pay/redirect-proxy — редирект на платёжную форму Paygine (SDPayIn).
 * Принимает только tid + подписанный redirectToken; форму собирает сервер (защита от подделки параметров).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaygineConfig, getAppUrl } from "@/lib/config";
import { getSDPayInEndpoint, buildSDPayInFormParams } from "@/lib/payment/paygine/client";
import { verifyPayRedirectToken } from "@/lib/payment/redirect-token";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  return new NextResponse("Method Not Allowed. Use POST from the payment redirect form.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Invalid form data", { status: 400 });
  }

  const tid = formData.get("tid");
  const redirectToken = formData.get("redirectToken");
  if (typeof tid !== "string" || typeof redirectToken !== "string" || !tid.trim() || !redirectToken.trim()) {
    return new NextResponse("Неверные параметры редиректа. Перейдите к оплате заново.", { status: 400 });
  }

  const verifiedTid = verifyPayRedirectToken(redirectToken.trim());
  if (!verifiedTid || verifiedTid !== tid.trim()) {
    return new NextResponse("Ссылка на оплату недействительна или истекла. Перейдите к оплате заново.", { status: 400 });
  }

  const config = getPaygineConfig();
  const baseUrl = getAppUrl();
  if (!config || !baseUrl) {
    return new NextResponse("Платёжный шлюз не настроен.", { status: 503 });
  }

  const tx = await db.transaction.findUnique({
    where: { id: verifiedTid },
    select: { id: true, status: true, externalId: true, amountKop: true, paygineOrderSdRef: true },
  });

  if (!tx || tx.status !== "PENDING" || !tx.externalId || !tx.paygineOrderSdRef?.trim()) {
    return new NextResponse("Платёж не найден или уже обработан. Создайте платёж заново.", { status: 400 });
  }

  const orderId = parseInt(tx.externalId, 10);
  if (!Number.isFinite(orderId)) {
    return new NextResponse("Неверные данные платежа.", { status: 400 });
  }

  const formParams = buildSDPayInFormParams(config, {
    orderId,
    amountKop: Number(tx.amountKop),
    sdRef: tx.paygineOrderSdRef.trim(),
    url: `${baseUrl}/pay/result?tid=${tx.id}&outcome=success`,
    failurl: `${baseUrl}/pay/result?tid=${tx.id}&outcome=fail`,
  });

  const paygineUrl = getSDPayInEndpoint();
  const inputs = Object.entries(formParams)
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}" />`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Перенаправление на оплату</title>
</head>
<body>
  <p>Перенаправление на платёжную форму…</p>
  <form id="f" method="POST" action="${escapeHtml(paygineUrl)}">
    ${inputs}
  </form>
  <script>document.getElementById("f").submit();</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
