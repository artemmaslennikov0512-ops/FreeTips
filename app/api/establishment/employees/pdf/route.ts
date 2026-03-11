/**
 * GET /api/establishment/employees/pdf — скачать PDF с карточками в стиле страницы оплаты
 * (фон заведения, бренд, логотип, имя сотрудника, QR). Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync, existsSync } from "fs";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

const REF_CARD_WIDTH_PT = 190;
const REF_CARD_HEIGHT_PT = 138;
const MM_TO_PT = 2.834645669;
const COLS = 2;
const ROWS = 5;
const MARGIN = 36;
const CARD_GAP_X = 12;
const CARD_GAP_Y = 10;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

const DEFAULT_NAVY = { r: 10 / 255, g: 25 / 255, b: 47 / 255 };
const DEFAULT_GOLD = { r: 197 / 255, g: 165 / 255, b: 114 / 255 };
const DEFAULT_WHITE = { r: 1, g: 1, b: 1 };
const BLOCKS_BG_DARK = { r: 0.06, g: 0.12, b: 0.22 };

function getOrigin(request: NextRequest): string {
  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return "https://example.com";
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([0-9A-Fa-f]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return {
    r: (n >> 16) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

async function fetchImageAsPng(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    return bytes;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const origin = getOrigin(request);
  const baseUrl = getBaseUrlFromRequest(origin) || origin;
  const payBase = `${baseUrl.replace(/\/$/, "")}/pay`;

  const [employees, establishment] = await Promise.all([
    db.employee.findMany({
      where: { establishmentId: auth.establishmentId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, qrCodeIdentifier: true, printCardPhotoUrl: true },
    }),
    db.establishment.findUnique({
      where: { id: auth.establishmentId },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        mainBackgroundColor: true,
        blocksBackgroundColor: true,
        fontColor: true,
        borderColor: true,
        printCardWidthMm: true,
        printCardHeightMm: true,
        printCardFooterColor: true,
      },
    }),
  ]);

  if (employees.length === 0) {
    return NextResponse.json(
      { error: "Нет активных сотрудников для печати QR" },
      { status: 400 },
    );
  }

  const cardBgRgb = establishment?.mainBackgroundColor
    ? hexToRgb(establishment.mainBackgroundColor)
    : DEFAULT_NAVY;
  const borderRgb = establishment?.primaryColor
    ? hexToRgb(establishment.primaryColor)
    : DEFAULT_GOLD;
  const fontRgb = establishment?.fontColor
    ? hexToRgb(establishment.fontColor)
    : DEFAULT_WHITE;
  const blocksBgRgb = establishment?.blocksBackgroundColor
    ? hexToRgb(establishment.blocksBackgroundColor)
    : BLOCKS_BG_DARK;
  const footerRgb = establishment?.printCardFooterColor
    ? hexToRgb(establishment.printCardFooterColor)
    : fontRgb;

  const cardBg = cardBgRgb ? rgb(cardBgRgb.r, cardBgRgb.g, cardBgRgb.b) : rgb(DEFAULT_NAVY.r, DEFAULT_NAVY.g, DEFAULT_NAVY.b);
  const borderColorPdf = borderRgb ? rgb(borderRgb.r, borderRgb.g, borderRgb.b) : rgb(DEFAULT_GOLD.r, DEFAULT_GOLD.g, DEFAULT_GOLD.b);
  const fontColor = fontRgb ? rgb(fontRgb.r, fontRgb.g, fontRgb.b) : rgb(1, 1, 1);
  const footerColor = footerRgb ? rgb(footerRgb.r, footerRgb.g, footerRgb.b) : fontColor;
  const blocksBg = blocksBgRgb ? rgb(blocksBgRgb.r, blocksBgRgb.g, blocksBgRgb.b) : rgb(BLOCKS_BG_DARK.r, BLOCKS_BG_DARK.g, BLOCKS_BG_DARK.b);

  let logoPng: Uint8Array | null = null;
  if (establishment?.logoUrl) {
    const absoluteLogoUrl =
      establishment.logoUrl.startsWith("http")
        ? establishment.logoUrl
        : new URL(establishment.logoUrl, baseUrl).toString();
    logoPng = await fetchImageAsPng(absoluteLogoUrl);
  }

  const doc = await PDFDocument.create();
  const font = doc.embedStandardFont(StandardFonts.Helvetica);
  const fontBold = doc.embedStandardFont(StandardFonts.HelveticaBold);

  let logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (logoPng && logoPng.length > 0) {
    try {
      logoImage = await doc.embedPng(logoPng);
    } catch {
      try {
        logoImage = await doc.embedJpg(logoPng);
      } catch {
        // ignore — рисуем название заведения текстом
      }
    }
  }

  const cardWidthMm = establishment?.printCardWidthMm ?? 67;
  const cardHeightMm = establishment?.printCardHeightMm ?? 49;
  const CARD_WIDTH = cardWidthMm * MM_TO_PT;
  const CARD_HEIGHT = cardHeightMm * MM_TO_PT;
  const scaleX = CARD_WIDTH / REF_CARD_WIDTH_PT;
  const scaleY = CARD_HEIGHT / REF_CARD_HEIGHT_PT;

  let cardIndex = 0;
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const cardFullWidth = CARD_WIDTH + CARD_GAP_X;
  const cardFullHeight = CARD_HEIGHT + CARD_GAP_Y;

  for (const emp of employees) {
    if (cardIndex > 0 && cardIndex % (COLS * ROWS) === 0) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }

    const col = cardIndex % COLS;
    const row = Math.floor(cardIndex / COLS) % ROWS;
    const x = MARGIN + col * cardFullWidth;
    const cardY = PAGE_HEIGHT - MARGIN - (row + 1) * cardFullHeight + CARD_GAP_Y;

    const pad = 8 * Math.min(scaleX, scaleY);
    const innerLeft = x + pad;
    const innerWidth = CARD_WIDTH - pad * 2;

    const headerH = 22 * scaleY;
    const headerY = cardY + CARD_HEIGHT - pad - headerH;

    page.drawRectangle({
      x,
      y: cardY,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      color: cardBg,
      borderColor: borderColorPdf,
      borderWidth: 1.2 * Math.min(scaleX, scaleY),
    });

    if (logoImage) {
      const logoMaxW = innerWidth - 4 * scaleX;
      const logoMaxH = headerH - 4 * scaleY;
      const logoW = Math.min(logoImage.width, logoMaxW);
      const logoH = Math.min(logoMaxH, (logoImage.height / logoImage.width) * logoW);
      const logoX = x + (CARD_WIDTH - logoW) / 2;
      page.drawImage(logoImage, {
        x: logoX,
        y: headerY + (headerH - logoH) / 2,
        width: logoW,
        height: logoH,
      });
    } else {
      const title = (establishment?.name ?? "FreeTips").slice(0, 28);
      const titleSize = 9 * Math.min(scaleX, scaleY);
      page.drawText(title, {
        x: innerLeft,
        y: headerY + 4 * scaleY,
        size: titleSize,
        font: fontBold,
        color: fontColor,
      });
    }

    const blockGap = 6 * scaleY;
    const footerReserve = 12 * scaleY;
    const topSectionH = 50 * scaleY;
    const qrSize = 48 * Math.min(scaleX, scaleY);
    const blockH = Math.min(
      headerY - blockGap - (cardY + footerReserve),
      Math.max(72 * scaleY, topSectionH + qrSize + 4 * scaleY),
    );
    const blockY = headerY - blockGap - blockH;
    page.drawRectangle({
      x: innerLeft,
      y: blockY,
      width: innerWidth,
      height: blockH,
      color: blocksBg,
      borderColor: borderColorPdf,
      borderWidth: 0.5 * Math.min(scaleX, scaleY),
    });

    const textX = innerLeft + 6 * scaleX;
    const nameSize = 11 * Math.min(scaleX, scaleY);
    const posSize = 9 * Math.min(scaleX, scaleY);
    const photoSize = 28 * Math.min(scaleX, scaleY);
    let nameY = blockY + blockH - 14 * scaleY;
    let photoDrawn = false;
    if (emp.printCardPhotoUrl?.trim()) {
      const storagePath = join(process.cwd(), "storage", emp.printCardPhotoUrl);
      if (existsSync(storagePath)) {
        try {
          const imgBuf = readFileSync(storagePath);
          const bytes = new Uint8Array(imgBuf);
          const ext = (emp.printCardPhotoUrl.split(".").pop() ?? "").toLowerCase();
          const embed =
            ext === "png"
              ? await doc.embedPng(bytes)
              : ext === "jpg" || ext === "jpeg"
                ? await doc.embedJpg(bytes)
                : null;
          if (embed) {
            const photoX = innerLeft + (innerWidth - photoSize) / 2;
            const photoY = blockY + blockH - photoSize - 4 * scaleY;
            page.drawImage(embed, {
              x: photoX,
              y: photoY,
              width: photoSize,
              height: photoSize,
            });
            photoDrawn = true;
            nameY = photoY - 4 * scaleY - 14 * scaleY;
          }
        } catch {
          // skip photo on embed error
        }
      }
    }
    if (!photoDrawn) {
      nameY = blockY + blockH - 14 * scaleY;
    }
    const posY = nameY - 14 * scaleY;
    page.drawText(emp.name.slice(0, 24), {
      x: textX,
      y: nameY,
      size: nameSize,
      font: fontBold,
      color: fontColor,
    });
    if (emp.position) {
      page.drawText(emp.position.slice(0, 26), {
        x: textX,
        y: posY,
        size: posSize,
        font,
        color: fontColor,
      });
    }

    const payUrl = `${payBase}/${emp.qrCodeIdentifier}`;
    const dataUrl = await QRCode.toDataURL(payUrl, { width: 140, margin: 1 });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const pngBytes = Uint8Array.from(Buffer.from(base64, "base64"));
    const qrImage = await doc.embedPng(pngBytes);
    const qrX = innerLeft + (innerWidth - qrSize) / 2;
    const qrY = blockY + (blockH - qrSize) / 2;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const footerSize = 7 * Math.min(scaleX, scaleY);
    page.drawText("Отсканируйте для чаевых", {
      x: innerLeft,
      y: blockY - 8 * scaleY,
      size: footerSize,
      font,
      color: footerColor,
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
