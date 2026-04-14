/**
 * GET /api/pay/table/[slug] — публичные данные для гостя: постоянный код стола (NNN-NNN).
 * Состояния: обслуживание / нет счёта / пречек к оплате (сумма зафиксирована после «закрыть стол»).
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIpAndRateLimitKey, checkRateLimitByIP, PAY_RATE_LIMIT_IP } from "@/lib/middleware/rate-limit";
import { rateLimit429Response } from "@/lib/api/helpers";
import { resolveTablePayGuestPayload } from "@/lib/table-pay-guest-state";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { rateLimitKey } = getClientIpAndRateLimitKey(request);
  const rateLimitIp = await checkRateLimitByIP(rateLimitKey, PAY_RATE_LIMIT_IP);
  if (!rateLimitIp.allowed) {
    return rateLimit429Response(rateLimitIp);
  }

  const { slug } = await ctx.params;
  const payload = await resolveTablePayGuestPayload(slug);

  if (payload.state === "invalid_slug") {
    return NextResponse.json({ error: "Некорректный код" }, { status: 400 });
  }
  if (payload.state === "not_found") {
    return NextResponse.json({ error: "Стол не найден" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
