/**
 * GET /api/establishment/settings — настройки заведения (бренд) для ЛК.
 * PATCH /api/establishment/settings — обновить бренд (logoUrl, primaryColor, secondaryColor).
 * Требует: ESTABLISHMENT_ADMIN
 */

import { NextRequest, NextResponse } from "next/server";
import { requireEstablishmentAdmin } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError } from "@/lib/api/helpers";
import { z } from "zod";

const hexOptional = z
  .union([z.string().trim().max(20), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v == null ? null : v))
  .refine((v) => v === null || /^#[0-9A-Fa-f]{6}$/i.test(v), "Укажите цвет в формате #RRGGBB");

const updateSettingsSchema = z.object({
  resetToDefaults: z.boolean().optional(),
  logoUrl: z
    .union([z.string().trim().max(512), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v))
    .refine((v) => v === null || /^https?:\/\/.+/.test(v), "Некорректный URL"),
  primaryColor: z.string().trim().max(20).optional().nullable(),
  secondaryColor: z.string().trim().max(20).optional().nullable(),
  mainBackgroundColor: hexOptional,
  mainBackgroundOpacityPercent: z.number().int().min(0).max(100).optional().nullable(),
  blocksBackgroundColor: hexOptional,
  blocksBackgroundOpacityPercent: z.number().int().min(0).max(100).optional().nullable(),
  secondaryOpacityPercent: z.number().int().min(0).max(100).optional().nullable(),
  fontColor: hexOptional,
  borderColor: hexOptional,
  borderWidthPx: z.number().int().min(0).max(8).optional().nullable(),
  borderOpacityPercent: z.number().int().min(0).max(100).optional().nullable(),
  printCardWidthMm: z.number().int().min(20).max(200).optional().nullable(),
  printCardHeightMm: z.number().int().min(20).max(200).optional().nullable(),
  printCardFooterColor: hexOptional,
  logoOpacityPercent: z.number().int().min(0).max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const est = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: {
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      mainBackgroundColor: true,
      mainBackgroundOpacityPercent: true,
      blocksBackgroundColor: true,
      blocksBackgroundOpacityPercent: true,
      secondaryOpacityPercent: true,
      fontColor: true,
      borderColor: true,
      borderWidthPx: true,
      borderOpacityPercent: true,
      printCardWidthMm: true,
      printCardHeightMm: true,
      printCardFooterColor: true,
      logoOpacityPercent: true,
    },
  });
  if (!est) {
    return NextResponse.json({ error: "Заведение не найдено" }, { status: 404 });
  }
  return NextResponse.json({
    logoUrl: est.logoUrl ?? null,
    logoOpacityPercent: est.logoOpacityPercent ?? null,
    primaryColor: est.primaryColor ?? null,
    secondaryColor: est.secondaryColor ?? null,
    mainBackgroundColor: est.mainBackgroundColor ?? null,
    mainBackgroundOpacityPercent: est.mainBackgroundOpacityPercent ?? null,
    blocksBackgroundColor: est.blocksBackgroundColor ?? null,
    blocksBackgroundOpacityPercent: est.blocksBackgroundOpacityPercent ?? null,
    secondaryOpacityPercent: est.secondaryOpacityPercent ?? null,
    fontColor: est.fontColor ?? null,
    borderColor: est.borderColor ?? null,
    borderWidthPx: est.borderWidthPx ?? null,
    borderOpacityPercent: est.borderOpacityPercent ?? null,
    printCardWidthMm: est.printCardWidthMm ?? null,
    printCardHeightMm: est.printCardHeightMm ?? null,
    printCardFooterColor: est.printCardFooterColor ?? null,
    logoOpacityPercent: est.logoOpacityPercent ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireEstablishmentAdmin(request);
  if (auth.response) return auth.response;

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsed.ok) return parsed.response;

  const parseResult = updateSettingsSchema.safeParse(parsed.data);
  if (!parseResult.success) {
    const msg = parseResult.error.issues[0]?.message ?? "Неверные данные";
    return jsonError(400, msg);
  }

  if (parseResult.data.resetToDefaults === true) {
    await db.establishment.update({
      where: { id: auth.establishmentId },
      data: {
        logoUrl: null,
        primaryColor: null,
        secondaryColor: null,
        mainBackgroundColor: null,
        mainBackgroundOpacityPercent: null,
        blocksBackgroundColor: null,
        blocksBackgroundOpacityPercent: null,
        secondaryOpacityPercent: null,
        fontColor: null,
        borderColor: null,
        borderWidthPx: null,
        borderOpacityPercent: null,
        printCardWidthMm: null,
        printCardHeightMm: null,
        printCardFooterColor: null,
        logoOpacityPercent: null,
      },
    });
    const updated = await db.establishment.findUnique({
      where: { id: auth.establishmentId },
      select: {
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        mainBackgroundColor: true,
        mainBackgroundOpacityPercent: true,
        blocksBackgroundColor: true,
        blocksBackgroundOpacityPercent: true,
        secondaryOpacityPercent: true,
        fontColor: true,
        borderColor: true,
        borderWidthPx: true,
        borderOpacityPercent: true,
        printCardWidthMm: true,
        printCardHeightMm: true,
        printCardFooterColor: true,
        logoOpacityPercent: true,
      },
    });
    return NextResponse.json({
      logoUrl: updated?.logoUrl ?? null,
      primaryColor: updated?.primaryColor ?? null,
      secondaryColor: updated?.secondaryColor ?? null,
      mainBackgroundColor: updated?.mainBackgroundColor ?? null,
      mainBackgroundOpacityPercent: updated?.mainBackgroundOpacityPercent ?? null,
      blocksBackgroundColor: updated?.blocksBackgroundColor ?? null,
      blocksBackgroundOpacityPercent: updated?.blocksBackgroundOpacityPercent ?? null,
      secondaryOpacityPercent: updated?.secondaryOpacityPercent ?? null,
      fontColor: updated?.fontColor ?? null,
      borderColor: updated?.borderColor ?? null,
      borderWidthPx: updated?.borderWidthPx ?? null,
      borderOpacityPercent: updated?.borderOpacityPercent ?? null,
      printCardWidthMm: updated?.printCardWidthMm ?? null,
      printCardHeightMm: updated?.printCardHeightMm ?? null,
      printCardFooterColor: updated?.printCardFooterColor ?? null,
      logoOpacityPercent: updated?.logoOpacityPercent ?? null,
    });
  }

  const data: {
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    mainBackgroundColor?: string | null;
    mainBackgroundOpacityPercent?: number | null;
    blocksBackgroundColor?: string | null;
    blocksBackgroundOpacityPercent?: number | null;
    secondaryOpacityPercent?: number | null;
    fontColor?: string | null;
    borderColor?: string | null;
    borderWidthPx?: number | null;
    borderOpacityPercent?: number | null;
  printCardWidthMm?: number | null;
  printCardHeightMm?: number | null;
  printCardFooterColor?: string | null;
  logoOpacityPercent?: number | null;
  } = {};
  if (parseResult.data.logoUrl !== undefined) data.logoUrl = parseResult.data.logoUrl;
  if (parseResult.data.logoOpacityPercent !== undefined) data.logoOpacityPercent = parseResult.data.logoOpacityPercent;
  if (parseResult.data.primaryColor !== undefined) data.primaryColor = parseResult.data.primaryColor;
  if (parseResult.data.secondaryColor !== undefined) data.secondaryColor = parseResult.data.secondaryColor;
  if (parseResult.data.mainBackgroundColor !== undefined) data.mainBackgroundColor = parseResult.data.mainBackgroundColor;
  if (parseResult.data.mainBackgroundOpacityPercent !== undefined) data.mainBackgroundOpacityPercent = parseResult.data.mainBackgroundOpacityPercent;
  if (parseResult.data.blocksBackgroundColor !== undefined) data.blocksBackgroundColor = parseResult.data.blocksBackgroundColor;
  if (parseResult.data.blocksBackgroundOpacityPercent !== undefined) data.blocksBackgroundOpacityPercent = parseResult.data.blocksBackgroundOpacityPercent;
  if (parseResult.data.secondaryOpacityPercent !== undefined) data.secondaryOpacityPercent = parseResult.data.secondaryOpacityPercent;
  if (parseResult.data.fontColor !== undefined) data.fontColor = parseResult.data.fontColor;
  if (parseResult.data.borderColor !== undefined) data.borderColor = parseResult.data.borderColor;
  if (parseResult.data.borderWidthPx !== undefined) data.borderWidthPx = parseResult.data.borderWidthPx;
  if (parseResult.data.borderOpacityPercent !== undefined) data.borderOpacityPercent = parseResult.data.borderOpacityPercent;
  if (parseResult.data.printCardWidthMm !== undefined) data.printCardWidthMm = parseResult.data.printCardWidthMm;
  if (parseResult.data.printCardHeightMm !== undefined) data.printCardHeightMm = parseResult.data.printCardHeightMm;
  if (parseResult.data.printCardFooterColor !== undefined) data.printCardFooterColor = parseResult.data.printCardFooterColor;

  await db.establishment.update({
    where: { id: auth.establishmentId },
    data,
  });

  const updated = await db.establishment.findUnique({
    where: { id: auth.establishmentId },
    select: {
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      mainBackgroundColor: true,
      mainBackgroundOpacityPercent: true,
      blocksBackgroundColor: true,
      blocksBackgroundOpacityPercent: true,
      secondaryOpacityPercent: true,
      fontColor: true,
      borderColor: true,
      borderWidthPx: true,
      borderOpacityPercent: true,
      printCardWidthMm: true,
      printCardHeightMm: true,
      printCardFooterColor: true,
      logoOpacityPercent: true,
    },
  });
  return NextResponse.json({
    logoUrl: updated?.logoUrl ?? null,
    primaryColor: updated?.primaryColor ?? null,
    secondaryColor: updated?.secondaryColor ?? null,
    mainBackgroundColor: updated?.mainBackgroundColor ?? null,
    mainBackgroundOpacityPercent: updated?.mainBackgroundOpacityPercent ?? null,
    blocksBackgroundColor: updated?.blocksBackgroundColor ?? null,
    blocksBackgroundOpacityPercent: updated?.blocksBackgroundOpacityPercent ?? null,
    secondaryOpacityPercent: updated?.secondaryOpacityPercent ?? null,
    fontColor: updated?.fontColor ?? null,
    borderColor: updated?.borderColor ?? null,
    borderWidthPx: updated?.borderWidthPx ?? null,
    borderOpacityPercent: updated?.borderOpacityPercent ?? null,
    printCardWidthMm: updated?.printCardWidthMm ?? null,
    printCardHeightMm: updated?.printCardHeightMm ?? null,
    printCardFooterColor: updated?.printCardFooterColor ?? null,
    logoOpacityPercent: updated?.logoOpacityPercent ?? null,
  });
}
