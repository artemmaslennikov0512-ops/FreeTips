/**
 * POST /api/admin/payouts/[id]/send-paygine
 * Отправка выплаты в Paygine: SDPayOut с кубышки официанта на карту.
 * Тело: { pan: string } — номер карты (обязателен). У пользователя должен быть задан paygineSdRef.
 * Требует: SUPERADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { z } from "zod";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { sendPayoutToPaygine } from "@/lib/payment/send-payout-to-paygine";
import { logSecurity } from "@/lib/logger";

const bodySchema = z.object({
  pan: z.string().min(8, "Укажите номер карты (не менее 8 цифр)"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const { id: payoutId } = await params;

  const bodyResult = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!bodyResult.ok || bodyResult.data == null) {
    return NextResponse.json({ error: "Укажите номер карты в теле запроса: { \"pan\": \"...\" }" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Неверное тело запроса";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const result = await sendPayoutToPaygine(payoutId, {
    pan: parsed.data.pan,
    completedByUserId: auth.user.userId,
  });

  if (!result.success) {
    const status =
      result.error === "Paygine не настроен" ? 503
      : result.error === "Заявка не найдена" ? 404
      : result.error === "У пользователя не задана кубышка Paygine (paygineSdRef)" ||
        result.error === "Для вывода на карту укажите номер карты (pan)" ? 400
      : 502;
    return NextResponse.json(
      { error: result.error, code: result.code, description: result.description },
      { status },
    );
  }

  logSecurity("payout.sent_to_paygine", {
    payoutId,
    completedByUserId: auth.user.userId,
    operationId: result.operationId ?? null,
  });

  return NextResponse.json({
    success: true,
    payoutId,
    precheck_id: result.precheck_id,
    operationId: result.operationId,
    message: "Выплата отправлена в Paygine, статус заявки обновлён на COMPLETED",
  });
}
