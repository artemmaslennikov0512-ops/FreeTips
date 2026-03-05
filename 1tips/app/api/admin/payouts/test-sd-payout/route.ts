/**
 * POST /api/admin/payouts/test-sd-payout
 * Тестовая выплата через webapi/b2puser/sd-services:
 * SDPayOutSBPPrecheck(phone=70115110123, bank_id=1crt88888881, amount=1000703) → SDPayOutSBP(precheck_id).
 * Требует: SUPERADMIN. Заявку в БД не создаёт.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import {
  sdPayOutSBPPrecheck,
  sdPayOutSBP,
} from "@/lib/payment/paygine/client";

const TEST_PHONE = "70115110123";
const TEST_BANK_ID = "1crt88888881";
const TEST_AMOUNT = 1000703;

export async function POST(request: NextRequest) {
  const auth = await requireRole(["SUPERADMIN"])(request);
  if (auth.response) return auth.response;

  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD?.trim();
  if (!sector || !password) {
    return NextResponse.json(
      { error: "Paygine не настроен (PAYGINE_SECTOR, PAYGINE_PASSWORD)" },
      { status: 503 }
    );
  }

  const config = { sector, password };

  const precheckResult = await sdPayOutSBPPrecheck(config, {
    phone: TEST_PHONE,
    bank_id: TEST_BANK_ID,
    amount: TEST_AMOUNT,
  });

  if (!precheckResult.ok) {
    return NextResponse.json(
      {
        step: "SDPayOutSBPPrecheck",
        success: false,
        error: precheckResult.description,
        code: precheckResult.code,
        request: {
          phone: TEST_PHONE,
          bank_id: TEST_BANK_ID,
          amount: TEST_AMOUNT,
        },
      },
      { status: 502 }
    );
  }

  const payOutResult = await sdPayOutSBP(config, {
    precheck_id: precheckResult.precheck_id,
  });

  if (!payOutResult.ok) {
    return NextResponse.json(
      {
        step: "SDPayOutSBP",
        success: false,
        error: payOutResult.description,
        code: payOutResult.code,
        precheck_id: precheckResult.precheck_id,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    step: "SDPayOutSBP",
    precheck_id: precheckResult.precheck_id,
    operationId: payOutResult.operationId,
    request: {
      phone: TEST_PHONE,
      bank_id: TEST_BANK_ID,
      amount: TEST_AMOUNT,
    },
  });
}
