/**
 * POST /api/pay/redirect-proxy — прокидывает форму на Paygine (SDPayIn).
 * Нужен, когда CSP или туннель блокируют прямой action на внешний домен.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSDPayInEndpoint } from "@/lib/payment/paygine/client";

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
  const paygineUrl = getSDPayInEndpoint();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new NextResponse("Invalid form data", { status: 400 });
  }

  const inputs = Array.from(formData.entries())
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`,
    )
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
