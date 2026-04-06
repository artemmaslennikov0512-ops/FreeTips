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

async function embedImageBytes(doc: PDFDocument, bytes: Uint8Array) {
  try {
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const QR_HOLDER_BG = rgb(0.93, 0.93, 0.93);
const QR_HOLDER_BORDER = rgb(0.72, 0.72, 0.72);
const CARD_EDGE = rgb(0.82, 0.82, 0.82);

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
        printCardTemplate: true,
        printPartnerLogoUrl: true,
        printQrHintText: true,
        printBannerText: true,
        printBannerSubtext: true,
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
    logoImage = await embedImageBytes(doc, logoPng);
  }

  let partnerLogoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  if (establishment?.printCardTemplate === "white_pos" && establishment.printPartnerLogoUrl?.trim()) {
    const pUrl = establishment.printPartnerLogoUrl.startsWith("http")
      ? establishment.printPartnerLogoUrl.trim()
      : new URL(establishment.printPartnerLogoUrl.trim(), baseUrl).toString();
    const pBytes = await fetchImageAsPng(pUrl);
    if (pBytes?.length) partnerLogoImage = await embedImageBytes(doc, pBytes);
  }

  const isWhitePos = establishment?.printCardTemplate === "white_pos";
  const qrHintText =
    establishment?.printQrHintText?.trim() ||
    (isWhitePos ? "Отсканируйте QR-код" : "Отсканируйте для чаевых");
  const bannerLine =
    establishment?.printBannerText?.trim() || (establishment?.name ?? "FreeTips").slice(0, 42);
  const bannerSub = establishment?.printBannerSubtext?.trim() || "команда ресторана";

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
    const s = Math.min(scaleX, scaleY);

    if (isWhitePos) {
      const innerTop = cardY + CARD_HEIGHT - pad;
      const innerBot = cardY + pad;

      page.drawRectangle({
        x,
        y: cardY,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        color: WHITE,
        borderColor: CARD_EDGE,
        borderWidth: 0.55 * s,
      });

      const logoRowH = 13 * s;
      const half = (innerWidth - 4 * s) / 2;
      const yHeaderAnchor = innerTop - 3 * s;

      if (partnerLogoImage) {
        const lw = Math.min(partnerLogoImage.width, half - 2 * s);
        const lh = Math.min(logoRowH, (partnerLogoImage.height / partnerLogoImage.width) * lw);
        page.drawImage(partnerLogoImage, {
          x: innerLeft + s,
          y: yHeaderAnchor - lh,
          width: lw,
          height: lh,
        });
      }

      if (logoImage) {
        const rw = Math.min(logoImage.width, half - 2 * s);
        const rh = Math.min(logoRowH, (logoImage.height / logoImage.width) * rw);
        page.drawImage(logoImage, {
          x: innerLeft + innerWidth - rw - s,
          y: yHeaderAnchor - rh,
          width: rw,
          height: rh,
        });
      } else if (!partnerLogoImage) {
        const title = (establishment?.name ?? "FreeTips").slice(0, 26);
        const ts = 8 * s;
        const tw = fontBold.widthOfTextAtSize(title, ts);
        page.drawText(title, {
          x: innerLeft + (innerWidth - tw) / 2,
          y: yHeaderAnchor - 10 * s,
          size: ts,
          font: fontBold,
          color: BLACK,
        });
      } else {
        const title = (establishment?.name ?? "FreeTips").slice(0, 22);
        const ts = 7 * s;
        const tw = fontBold.widthOfTextAtSize(title, ts);
        page.drawText(title, {
          x: innerLeft + half + 2 * s + Math.max(0, (half - tw) / 2),
          y: yHeaderAnchor - 9 * s,
          size: ts,
          font: fontBold,
          color: BLACK,
        });
      }

      const subSize = 6 * s;
      const subW = font.widthOfTextAtSize(bannerSub, subSize);
      page.drawText(bannerSub, {
        x: innerLeft + (innerWidth - subW) / 2,
        y: innerBot + 4 * s,
        size: subSize,
        font,
        color: BLACK,
      });
      const lineY = innerBot + 11 * s;
      page.drawLine({
        start: { x: innerLeft + 6 * s, y: lineY },
        end: { x: innerLeft + innerWidth - 6 * s, y: lineY },
        thickness: 0.4 * s,
        color: BLACK,
      });
      const pillTitleSize = 7.5 * s;
      const bl = bannerLine.slice(0, 36);
      const pillTW = fontBold.widthOfTextAtSize(bl, pillTitleSize);
      const pillW = pillTW + 10 * s;
      const pillH = pillTitleSize + 3.5 * s;
      const pillX = innerLeft + (innerWidth - pillW) / 2;
      const pillBottom = lineY + 5 * s;
      page.drawRectangle({
        x: pillX,
        y: pillBottom,
        width: pillW,
        height: pillH,
        borderColor: BLACK,
        borderWidth: 0.45 * s,
      });
      page.drawText(bl, {
        x: pillX + 5 * s,
        y: pillBottom + 1.3 * s,
        size: pillTitleSize,
        font: fontBold,
        color: BLACK,
      });

      const qrBoxBottom = pillBottom + pillH + 5 * s;
      const qrBoxTop = yHeaderAnchor - logoRowH - 5 * s;
      let boxH = qrBoxTop - qrBoxBottom;
      if (boxH < 30 * s) boxH = 30 * s;

      page.drawRectangle({
        x: innerLeft,
        y: qrBoxBottom,
        width: innerWidth,
        height: boxH,
        color: QR_HOLDER_BG,
        borderColor: QR_HOLDER_BORDER,
        borderWidth: 0.5 * s,
      });

      const payUrl = `${payBase}/${emp.qrCodeIdentifier}`;
      const dataUrlW = await QRCode.toDataURL(payUrl, { width: 140, margin: 1 });
      const pngBytesW = Uint8Array.from(
        Buffer.from(dataUrlW.replace(/^data:image\/png;base64,/, ""), "base64"),
      );
      const qrImageW = await doc.embedPng(pngBytesW);

      const boxTop = qrBoxBottom + boxH;
      let baseline = boxTop - 7 * s;
      const nameS = 7 * s;
      const nm = emp.name.slice(0, 22);
      const nmW = fontBold.widthOfTextAtSize(nm, nameS);
      page.drawText(nm, {
        x: innerLeft + (innerWidth - nmW) / 2,
        y: baseline,
        size: nameS,
        font: fontBold,
        color: BLACK,
      });
      baseline -= nameS + 2 * s;
      if (emp.position) {
        const posS = 6 * s;
        const ps = emp.position.slice(0, 28);
        const pw = font.widthOfTextAtSize(ps, posS);
        page.drawText(ps, {
          x: innerLeft + (innerWidth - pw) / 2,
          y: baseline,
          size: posS,
          font,
          color: BLACK,
        });
        baseline -= posS + 3 * s;
      } else {
        baseline -= 2 * s;
      }
      const qrSz = Math.max(
        12 * s,
        Math.min(40 * s, baseline - qrBoxBottom - 10 * s, innerWidth - 8 * s),
      );
      const qrBottom = baseline - qrSz - 2 * s;
      page.drawImage(qrImageW, {
        x: innerLeft + (innerWidth - qrSz) / 2,
        y: qrBottom,
        width: qrSz,
        height: qrSz,
      });
      const hintS = 5.5 * s;
      const ht = qrHintText.slice(0, 52);
      const hw = font.widthOfTextAtSize(ht, hintS);
      page.drawText(ht, {
        x: innerLeft + (innerWidth - hw) / 2,
        y: qrBottom - 3 * s,
        size: hintS,
        font,
        color: BLACK,
      });

      cardIndex++;
      continue;
    }

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
    const hintWc = font.widthOfTextAtSize(qrHintText, footerSize);
    page.drawText(qrHintText, {
      x: innerLeft + Math.max(0, (innerWidth - hintWc) / 2),
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
