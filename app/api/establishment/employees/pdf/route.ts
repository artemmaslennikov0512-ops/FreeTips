/**
 * GET /api/establishment/employees/pdf — скачать PDF с QR-кодами для всех активных сотрудников.
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 120;
const COLS = 2;
const ROWS = 4;
const MARGIN = 40;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function getOrigin(request: NextRequest): string {
  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return "https://example.com";
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const origin = getOrigin(request);
  const baseUrl = getBaseUrlFromRequest(origin) || origin;
  const payBase = `${baseUrl.replace(/\/$/, "")}/pay`;

  const employees = await db.employee.findMany({
    where: { establishmentId: auth.establishmentId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, position: true, qrCodeIdentifier: true },
  });

  if (employees.length === 0) {
    return NextResponse.json(
      { error: "Нет активных сотрудников для печати QR" },
      { status: 400 },
    );
  }

  const doc = await PDFDocument.create();
  const font = doc.embedStandardFont(StandardFonts.Helvetica);

  let cardIndex = 0;
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  for (const emp of employees) {
    if (cardIndex > 0 && cardIndex % (COLS * ROWS) === 0) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    const col = cardIndex % COLS;
    const row = Math.floor(cardIndex / COLS) % ROWS;
    const x = MARGIN + col * (CARD_WIDTH + 20);
    const cardY = y - row * (CARD_HEIGHT + 16) - CARD_HEIGHT;

    const payUrl = `${payBase}/${emp.qrCodeIdentifier}`;
    const dataUrl = await QRCode.toDataURL(payUrl, { width: 120, margin: 1 });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const pngBytes = Uint8Array.from(Buffer.from(base64, "base64"));
    const qrImage = await doc.embedPng(pngBytes);
    const qrSize = 56;

    page.drawRectangle({
      x: x - 4,
      y: cardY - 4,
      width: CARD_WIDTH + 8,
      height: CARD_HEIGHT + 8,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 0.5,
    });

    page.drawImage(qrImage, {
      x: x + 4,
      y: cardY + CARD_HEIGHT - 4 - qrSize,
      width: qrSize,
      height: qrSize,
    });

    page.drawText(emp.name, {
      x: x + qrSize + 14,
      y: cardY + CARD_HEIGHT - 18,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (emp.position) {
      page.drawText(emp.position, {
        x: x + qrSize + 14,
        y: cardY + CARD_HEIGHT - 32,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    page.drawText(`Чаевые: ${payBase}/${emp.qrCodeIdentifier}`, {
      x: x + 4,
      y: cardY + 4,
      size: 6,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    cardIndex++;
  }

  const pdfBytes = await doc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="qr-cards.pdf"',
    },
  });
}
