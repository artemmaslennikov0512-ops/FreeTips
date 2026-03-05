/**
 * Генерация PDF-чека на русском.
 * — Формат: ширина 80 мм (кассовая лента), шрифты с поддержкой кириллицы (обязательно).
 * — Содержание: дата/время, идентификатор, тип операции, отправитель/получатель, реквизиты, сумма, комиссия, статус (в соответствии с требованиями к документам по переводу средств).
 */

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/** Ширина чека 80 мм в пунктах (1 мм ≈ 2,835 pt). */
const RECEIPT_WIDTH_MM = 80;
const PT_PER_MM = 2.834645669;
const PAGE_WIDTH_PT = Math.round(RECEIPT_WIDTH_MM * PT_PER_MM);
/** Высота страницы чека (блок «Операция выполнена» полностью помещается). */
const PAGE_HEIGHT_PT = 280;

const SITE_NAME = "FreeTips";
const COMMISSION = "0,00 ₽";

/**
 * Для чека: реквизиты без префикса (только номер карты или только номер телефона),
 * и банк при переводе по телефону (из «Телефон (Банк): номер»).
 */
function parseDetailsForReceipt(details: string): { requisites: string; bank: string | null } {
  const s = (details || "").trim();
  if (s.startsWith("Карта:") || s.startsWith("Карта: ")) {
    const num = s.startsWith("Карта: ") ? s.slice(7).trim() : s.slice(6).trim();
    return { requisites: num || "—", bank: null };
  }
  const phoneMatch = s.match(/^Телефон\s*\(([^)]+)\)\s*:\s*(.+)$/);
  if (phoneMatch) {
    return { requisites: phoneMatch[2].trim() || "—", bank: phoneMatch[1].trim() || null };
  }
  return { requisites: s || "—", bank: null };
}

export interface PayoutReceiptData {
  id: string;
  amountKop: number;
  details: string;
  status: string;
  createdAt: string;
  senderName: string;
  recipientName?: string | null;
  /** "phone" — перевод по номеру телефона, "card" — перевод на карту */
  operationType: "phone" | "card";
}

export interface ReceiptOptions {
  /** TTF-шрифт с поддержкой кириллицы (обязателен для русского текста) */
  fontBytes: Uint8Array;
  /** PNG-логотип (опционально); иначе рисуется текст SITE_NAME */
  logoPngBytes?: Uint8Array;
}

const STATUS_LABEL: Record<string, string> = {
  CREATED: "Создана",
  PROCESSING: "В обработке",
  COMPLETED: "Выполнена",
  REJECTED: "Отклонена",
};

/** Пробел — тысячи, точка — копейки (10 000.00 ₽). */
function formatAmount(kop: number): string {
  const rub = kop / 100;
  const sign = rub < 0 ? "-" : "";
  const abs = Math.abs(rub).toFixed(2);
  const [intPart, decPart] = abs.split(".");
  const intWithSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${sign}${intWithSpaces}.${decPart} ₽`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const OPERATION_TYPE_LABEL: Record<"phone" | "card", string> = {
  phone: "Перевод по номеру телефона",
  card: "Перевод на карту",
};

/**
 * Создаёт PDF-чек и возвращает Uint8Array.
 */
export async function buildPayoutReceiptPdf(
  data: PayoutReceiptData,
  options: ReceiptOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(options.fontBytes);
  const page = doc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
  const { width, height } = page.getSize();
  const margin = 18;
  let y = height - margin;

  const titleSize = 12;
  const labelSize = 9;
  const valueSize = 9;
  const lineHeight = 16;

  // Логотип (уменьшен для 80 мм)
  if (options.logoPngBytes && options.logoPngBytes.length > 0) {
    try {
      const logoImage = await doc.embedPng(options.logoPngBytes);
      const logoW = 48;
      const logoH = (logoImage.height / logoImage.width) * logoW;
      page.drawImage(logoImage, { x: margin, y: y - logoH, width: logoW, height: logoH });
      y -= logoH + 10;
    } catch {
      page.drawText(SITE_NAME, { x: margin, y, size: 11, font, color: rgb(0.2, 0.3, 0.6) });
      y -= 16;
    }
  } else {
    page.drawText(SITE_NAME, { x: margin, y, size: 11, font, color: rgb(0.2, 0.3, 0.6) });
    y -= 16;
  }

  page.drawText("Чек по операции", { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 14;
  const operationLabel = OPERATION_TYPE_LABEL[data.operationType];
  page.drawText(operationLabel, {
    x: margin,
    y,
    size: titleSize,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 18;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.8,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 14;

  const truncate = (val: string, maxLen: number) =>
    val.length > maxLen ? val.slice(0, maxLen) + "…" : val;

  const line = (label: string, value: string) => {
    page.drawText(`${label}: `, { x: margin, y, size: labelSize, font, color: rgb(0.25, 0.25, 0.25) });
    const labelWidth = font.widthOfTextAtSize(`${label}: `, labelSize);
    const val = truncate(value, 32);
    const valWidth = font.widthOfTextAtSize(val, valueSize);
    const xVal = Math.min(margin + labelWidth, width - margin - valWidth - 2);
    page.drawText(val, { x: xVal, y, size: valueSize, font, color: rgb(0.15, 0.15, 0.15) });
    y -= lineHeight;
  };

  line("Дата и время", formatDate(data.createdAt));
  line("Операция", operationLabel);
  line("Отправитель", data.senderName);
  if (data.operationType === "phone" && data.recipientName?.trim()) {
    line("ФИО получателя", data.recipientName.trim());
  }
  const { requisites, bank } = parseDetailsForReceipt(data.details);
  line("Реквизиты", requisites);
  if (bank) {
    line("Банк", bank);
  }
  line("Сумма перевода", formatAmount(data.amountKop));
  line("Комиссия", COMMISSION);
  line("Статус", STATUS_LABEL[data.status] ?? data.status);

  y -= 14;
  const boxH = 22;
  const boxY = y - boxH;
  page.drawRectangle({
    x: margin,
    y: boxY,
    width: width - margin * 2,
    height: boxH,
    borderColor: rgb(0.4, 0.55, 0.85),
    borderWidth: 0.8,
    color: rgb(0.95, 0.97, 1),
  });
  const doneText = "Операция выполнена";
  const doneW = font.widthOfTextAtSize(doneText, 10);
  page.drawText(doneText, {
    x: margin + (width - margin * 2 - doneW) / 2,
    y: boxY + 6,
    size: 10,
    font,
    color: rgb(0.2, 0.4, 0.75),
  });
  return doc.save();
}
