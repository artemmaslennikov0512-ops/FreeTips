/**
 * GET /api/pay/[slug] — данные для страницы приёма чаевых (имя получателя).
 * POST /api/pay/[slug] — инициализация платежа через PaymentGateway (заглушка или провайдер).
 * Slug "demo" (из config/site) — демо-страница без реальной ссылки в БД.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentSchema } from "@/lib/validations";
import { getPaymentGateway } from "@/lib/payment/stub-gateway";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import {
  getClientIP,
  checkRateLimitByIP,
  checkRateLimitByKey,
  PAY_RATE_LIMIT_IP,
  PAY_RATE_LIMIT_SLUG,
} from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, internalError, rateLimit429Response } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { site } from "@/config/site";
import {
  PAY_PAGE_BRANDING_OVERRIDES,
  PAY_PAGE_M5_COMPETITION_BRANDING,
  PAY_PAGE_SLUGS_SKIP_M5_LOGIN_BRANDING,
} from "@/config/pay-branding-overrides";
import { mergePayPageBranding } from "@/lib/pay-branding-merge";
import { isCabinetM5CompetitionTheme } from "@/config/cabinet-theme-logins";
import { getPlatformPaymentSettings } from "@/lib/platform-payment-settings";
import { recipientCanAcceptIncomingTips } from "@/lib/payment-accept-policy";
import { FRAUD_RULE, recordFraudSignal } from "@/lib/fraud-signals";

const DEMO_SLUG = "demoPaySlug" in site && typeof site.demoPaySlug === "string" ? site.demoPaySlug : null;

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (DEMO_SLUG && slug === DEMO_SLUG) {
    return NextResponse.json({ recipientName: "Демо-получатель", acceptPayments: false });
  }

  const [tipLink, paymentSettings] = await Promise.all([
    db.tipLink.findUnique({
      where: { slug },
      select: {
      id: true,
      employeeId: true,
      employee: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          establishment: {
            select: {
              logoUrl: true,
              logoOpacityPercent: true,
              primaryColor: true,
              secondaryColor: true,
              mainBackgroundColor: true,
              blocksBackgroundColor: true,
              fontColor: true,
              borderColor: true,
              borderWidthPx: true,
              borderOpacityPercent: true,
            },
          },
        },
      },
      user: { select: { id: true, login: true, fullName: true, savingFor: true, profilePhotoUrl: true } },
    },
  }),
    getPlatformPaymentSettings(),
  ]);

  if (!tipLink) {
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 });
  }

  const fullName = tipLink.user.fullName?.trim() || "";
  const employeeName = tipLink.employee?.name?.trim() || "";
  const login = tipLink.user.login || "";
  // ФИО в формате «Фамилия Имя Отчество» — на странице оплаты показываем только имя (второе слово)
  const firstNameFromFullName =
    fullName && fullName.length > 0
      ? (() => {
          const parts = fullName.split(/\s+/).filter(Boolean);
          return parts.length >= 2 ? parts[1]! : parts[0] ?? fullName;
        })()
      : "";
  const displayName = firstNameFromFullName || employeeName || login || "";
  const recipientName = displayName ? `Официант, ${displayName}` : "Официант";
  const brandingFromEstablishment = tipLink.employee?.establishment
    ? {
        logoUrl: tipLink.employee.establishment.logoUrl ?? undefined,
        logoOpacityPercent: tipLink.employee.establishment.logoOpacityPercent ?? undefined,
        primaryColor: tipLink.employee.establishment.primaryColor ?? undefined,
        secondaryColor: tipLink.employee.establishment.secondaryColor ?? undefined,
        mainBackgroundColor: tipLink.employee.establishment.mainBackgroundColor ?? undefined,
        blocksBackgroundColor: tipLink.employee.establishment.blocksBackgroundColor ?? undefined,
        fontColor: tipLink.employee.establishment.fontColor ?? undefined,
        borderColor: tipLink.employee.establishment.borderColor ?? undefined,
        borderWidthPx: tipLink.employee.establishment.borderWidthPx ?? undefined,
        borderOpacityPercent: tipLink.employee.establishment.borderOpacityPercent ?? undefined,
      }
    : undefined;
  const slugNorm = slug.trim().toLowerCase();
  const slugBrandingOverride =
    PAY_PAGE_BRANDING_OVERRIDES[slug] ?? PAY_PAGE_BRANDING_OVERRIDES[slugNorm];
  let branding = mergePayPageBranding(brandingFromEstablishment, slugBrandingOverride);
  const m5Login =
    isCabinetM5CompetitionTheme(login) && !PAY_PAGE_SLUGS_SKIP_M5_LOGIN_BRANDING.has(slugNorm);
  if (m5Login) {
    branding = mergePayPageBranding(branding, PAY_PAGE_M5_COMPETITION_BRANDING);
  }
  const savingFor = tipLink.user.savingFor?.trim() || undefined;
  const baseUrl = getBaseUrlFromRequest(request);
  const recipientPhotoUrl =
    tipLink.employee?.photoUrl && tipLink.employee?.id
      ? `${baseUrl.replace(/\/$/, "")}/api/establishment/employees/photo/${tipLink.employee.id}?type=avatar`
      : tipLink.user.profilePhotoUrl
        ? `${baseUrl.replace(/\/$/, "")}/api/profile/photo/${tipLink.user.id}`
        : undefined;
  const acceptPayments = recipientCanAcceptIncomingTips(tipLink.user.id, paymentSettings);

  return NextResponse.json({
    recipientName,
    acceptPayments,
    ...(branding && { branding }),
    ...(savingFor && { savingFor }),
    ...(recipientPhotoUrl && { recipientPhotoUrl }),
    ...(m5Login && { m5PayShell: true }),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  const { slug } = await params;

  if (DEMO_SLUG && slug === DEMO_SLUG) {
    return NextResponse.json(
      { error: "Это демо-страница. Чтобы получать чаевые, оставьте заявку на подключение." },
      { status: 400 },
    );
  }

  const rateLimitIp = await checkRateLimitByIP(ip, PAY_RATE_LIMIT_IP);
  if (!rateLimitIp.allowed) {
    logSecurity("pay.init.rate_limit_ip", { requestId, ip, slug });
    return rateLimit429Response(rateLimitIp);
  }

  const rateLimitSlug = await checkRateLimitByKey(slug, PAY_RATE_LIMIT_SLUG);
  if (!rateLimitSlug.allowed) {
    logSecurity("pay.init.rate_limit_slug", { requestId, ip, slug });
    return rateLimit429Response(rateLimitSlug, "Слишком много запросов на эту ссылку. Попробуйте позже.");
  }

  if (!verifyCsrfFromRequest(request)) {
    logSecurity("pay.init.csrf_invalid", { requestId, ip, slug });
    return NextResponse.json({ error: "Некорректный запрос. Обновите страницу и попробуйте снова." }, { status: 403 });
  }

  const [tipLink, paymentSettings] = await Promise.all([
    db.tipLink.findUnique({
      where: { slug },
      select: { id: true, userId: true, user: { select: { isBlocked: true } } },
    }),
    getPlatformPaymentSettings(),
  ]);

  if (!tipLink) {
    logSecurity("pay.init.not_found", { requestId, ip, slug });
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 });
  }

  if (tipLink.user.isBlocked) {
    logSecurity("pay.init.recipient_blocked", { requestId, ip, slug, recipientId: tipLink.userId });
    void recordFraudSignal({
      userId: tipLink.userId,
      ruleCode: FRAUD_RULE.PAY_RECIPIENT_BLOCKED,
      message: "Попытка инициализации оплаты на заблокированного получателя",
      metadata: { slug },
      dedupeMinutes: 60,
    });
    return NextResponse.json({ error: "Приём чаевых временно недоступен" }, { status: 403 });
  }

  if (!recipientCanAcceptIncomingTips(tipLink.userId, paymentSettings)) {
    logSecurity("pay.init.policy_blocked", { requestId, ip, slug, recipientId: tipLink.userId });
    void recordFraudSignal({
      userId: tipLink.userId,
      ruleCode: FRAUD_RULE.PAY_POLICY_BLOCKED,
      message: "Попытка оплаты при отключённом приёме (глобальный стоп, чёрный список или не в белом списке)",
      metadata: { slug },
      dedupeMinutes: 60,
    });
    return NextResponse.json({ error: "Приём чаевых временно недоступен" }, { status: 403 });
  }

  const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_DEFAULT);
  if (!parsed.ok) return parsed.response;

  const validated = createPaymentSchema.safeParse(parsed.data);
  if (!validated.success) {
    logSecurity("pay.init.invalid_payload", { requestId, ip, slug });
    return jsonError(400, "Неверные данные", validated.error.issues);
  }

  const { amountKop, comment, idempotencyKey } = validated.data;
  const amountBigInt = typeof amountKop === "number" ? BigInt(amountKop) : amountKop;
  const baseUrl = getBaseUrlFromRequest(request);

  const gateway = getPaymentGateway();
  try {
    const result = await gateway.createPayment({
      linkId: tipLink.id,
      recipientId: tipLink.userId,
      amountKop: amountBigInt,
      idempotencyKey,
      comment: comment ?? null,
      baseUrl,
    });

    if (!result.success) {
      logSecurity("pay.init.failed", { requestId, ip, slug });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    logSecurity("pay.init.success", { requestId, ip, slug, transactionId: result.transactionId });
    const json: { success: true; transactionId: string; redirectUrl?: string } = {
      success: true,
      transactionId: result.transactionId,
    };
    if ("redirectUrl" in result && result.redirectUrl) {
      json.redirectUrl = result.redirectUrl;
    }
    return NextResponse.json(json);
  } catch (error) {
    logError("pay.init.error", error, { requestId, ip, slug });
    return internalError("Ошибка инициализации платежа");
  }
}
