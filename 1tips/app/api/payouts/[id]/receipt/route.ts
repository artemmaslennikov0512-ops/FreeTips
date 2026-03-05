/**
 * GET /api/payouts/[id]/receipt — скачать PDF-чек по заявке на вывод.
 * Доступ: владелец заявки или SUPERADMIN.
 * Чек: 80 мм, кириллица, соответствие требованиям к документам. Копия сохраняется на сервере для истории.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { buildPayoutReceiptPdf } from "@/lib/pdf/receipt";
import { logError, logWarn } from "@/lib/logger";

const FONT_URLS = [
  "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Regular.ttf",
];

/** Проверка, что байты похожи на TTF/OTF (не HTML 404 и т.п.). */
function validateFontBytes(buf: Uint8Array): void {
  if (buf.length < 4) throw new Error("Font file too small");
  const ttf = buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00;
  const otf = buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f;
  if (!ttf && !otf) throw new Error("Invalid font file (not TTF/OTF)");
}

async function getFontBytes(): Promise<Uint8Array> {
  const fontPath = join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
  if (existsSync(fontPath)) {
    const buf = new Uint8Array(readFileSync(fontPath));
    validateFontBytes(buf);
    return buf;
  }
  let lastErr: Error | null = null;
  for (const url of FONT_URLS) {
    try {
      const res = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      validateFontBytes(buf);
      return buf;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastErr ?? new Error("Font fetch failed");
}

function getLogoPngBytes(): Uint8Array | undefined {
  const logoPath = join(process.cwd(), "public", "logo.png");
  if (existsSync(logoPath)) {
    return new Uint8Array(readFileSync(logoPath));
  }
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthOrApiKey(request);
  if ("response" in authResult) return authResult.response;

  const { id } = await params;
  const userId = authResult.userId;
  const isSuperAdmin = authResult.role === "SUPERADMIN";

  const payout = await db.payoutRequest.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      amountKop: true,
      details: true,
      status: true,
      createdAt: true,
      recipientName: true,
      completedByUserId: true,
    },
  });

  if (!payout) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  if (!isSuperAdmin && payout.userId !== userId) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  if (payout.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Чек доступен только после успешного выполнения вывода" },
      { status: 403 },
    );
  }

  try {
    const fontBytes = await getFontBytes();
    const logoPngBytes = getLogoPngBytes();

    const isPhoneTransfer = payout.details.startsWith("Телефон");
    const pdfBytes = await buildPayoutReceiptPdf(
      {
        id: payout.id,
        amountKop: Number(payout.amountKop),
        details: payout.details,
        status: payout.status,
        createdAt: payout.createdAt.toISOString(),
        senderName: "FreeTips.World",
        recipientName: isPhoneTransfer ? (payout.recipientName?.trim() || null) : null,
        operationType: isPhoneTransfer ? "phone" : "card",
      },
      { fontBytes, logoPngBytes },
    );

    const filename = `chek-vyvod-${payout.id.slice(0, 8)}.pdf`;

    // Сохранение копии на сервере для истории
    try {
      const storageDir = join(process.cwd(), "storage", "receipts");
      if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
      const filePath = join(storageDir, `${payout.id}.pdf`);
      writeFileSync(filePath, Buffer.from(pdfBytes));
    } catch (saveErr) {
      logWarn("receipt.save_storage_failed", { payoutId: payout.id, error: String(saveErr) });
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    logError("receipt.pdf_error", err, { payoutId: id });
    const isDev = process.env.NODE_ENV !== "production";
    const msg = isDev && err instanceof Error ? err.message : "";
    const hint =
      isDev && (msg.includes("Font") || msg.includes("fetch") || msg.includes("Invalid font"))
        ? "Добавьте public/fonts/NotoSans-Regular.ttf (см. public/fonts/README.md)"
        : "Ошибка формирования чека";
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
