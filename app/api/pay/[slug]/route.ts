/**
 * GET /api/pay/[slug] — данные для страницы приёма чаевых (slug = код официанта в URL).
 * POST /api/pay/[slug] — инициализация платежа через PaymentGateway (заглушка или провайдер).
 * Демо-код из resolveDemoPaySlug() (config + NEXT_PUBLIC_DEMO_PAY_SLUG) — без записи в БД.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentSchema } from "@/lib/validations";
import { getPaymentGateway } from "@/lib/payment/stub-gateway";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import {
  getClientIpAndRateLimitKey,
  checkRateLimitByIP,
  checkRateLimitByKey,
  PAY_RATE_LIMIT_IP,
  PAY_RATE_LIMIT_SLUG,
} from "@/lib/middleware/rate-limit";
import { parseJsonWithLimit, MAX_BODY_SIZE_DEFAULT, jsonError, internalError, rateLimit429Response } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { resolveDemoPaySlug } from "@/lib/demo-pay-slug";
import { createPayRedirectToken } from "@/lib/payment/redirect-token";
import {
  PAY_PAGE_BRANDING_OVERRIDES,
  PAY_PAGE_M5_COMPETITION_BRANDING,
  PAY_PAGE_SLUGS_SKIP_M5_LOGIN_BRANDING,
} from "@/config/pay-branding-overrides";
import { mergePayPageBranding } from "@/lib/pay-branding-merge";
import { isCabinetM5CompetitionTheme } from "@/config/cabinet-theme-logins";
import { getPlatformPaymentSettingsRow } from "@/lib/platform-payment-settings";
import {
  evaluateRecipientPayLimits,
  evaluateRecipientPayLimitsForPayPage,
} from "@/lib/recipient-pay-limits";
import { recipientCanAcceptIncomingTips } from "@/lib/payment-accept-policy";
import { FRAUD_RULE, recordFraudSignal } from "@/lib/fraud-signals";
import { observePayInitBurstForSlug } from "@/lib/fraud-velocity-observe";
import {
  establishmentBoundForPayTipLink,
  loadTipLinkForPaySlug,
  resolvePayInitForSlug,
} from "@/lib/pay-slug-resolve";
import { routingModeForTipLink, TIP_ROUTING_EMPLOYEE_QR, TIP_ROUTING_POOL_QR } from "@/lib/tip-routing";

const DEMO_SLUG = resolveDemoPaySlug();

type Params = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (DEMO_SLUG && slug === DEMO_SLUG) {
    return NextResponse.json({ recipientName: "Демо-получатель", acceptPayments: false });
  }

  const [tipLink, platformRow] = await Promise.all([
    loadTipLinkForPaySlug(slug),
    getPlatformPaymentSettingsRow(),
  ]);
  const paymentSettings = {
    globalPaymentsDisabled: platformRow.globalPaymentsDisabled,
    paymentWhitelistUserIds: platformRow.paymentWhitelistUserIds,
    paymentBlacklistUserIds: platformRow.paymentBlacklistUserIds,
  };

  if (!tipLink) {
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 });
  }

  const baseUrl = getBaseUrlFromRequest(request);

  const est = await establishmentBoundForPayTipLink(slug, tipLink);
  const routingMode = routingModeForTipLink(tipLink, est);
  /** Пул заведения: код = uniqueSlug и TipLink принадлежит пользователю-пулу. */
  const establishmentPoolPayUi = !tipLink.employeeId && est != null;
  /** QR сотрудника, привязанного к заведению. */
  const employeePayUi = !!tipLink.employeeId;
  /** Личный код официанта без заведения — правила и ошибки заведения не применяются. */
  const personalRecipientPayUi = !tipLink.employeeId && est == null;

  const brandingFromEstablishment = est
    ? {
        logoUrl: est.logoUrl ?? undefined,
        logoOpacityPercent: est.logoOpacityPercent ?? undefined,
        primaryColor: est.primaryColor ?? undefined,
        secondaryColor: est.secondaryColor ?? undefined,
        mainBackgroundColor: est.mainBackgroundColor ?? undefined,
        blocksBackgroundColor: est.blocksBackgroundColor ?? undefined,
        fontColor: est.fontColor ?? undefined,
        borderColor: est.borderColor ?? undefined,
        borderWidthPx: est.borderWidthPx ?? undefined,
        borderOpacityPercent: est.borderOpacityPercent ?? undefined,
      }
    : undefined;

  const estName = (est?.name ?? "").trim() || "Заведение";
  let recipientName = "Получатель";
  let recipientPhotoUrl: string | undefined;
  let savingFor: string | undefined;
  let paymentUnavailableReason: string | undefined;

  if (establishmentPoolPayUi) {
    recipientName = `Чаевые — «${estName}»`;
    const logo = est?.logoUrl?.trim();
    recipientPhotoUrl =
      logo && /^https?:\/\//i.test(logo)
        ? logo
        : undefined;
    savingFor = undefined;
  } else if (employeePayUi) {
    const waiterProfile = tipLink.employee?.user;
    const fullName = waiterProfile?.fullName?.trim() || "";
    const employeeName = tipLink.employee?.name?.trim() || "";
    const login = waiterProfile?.login || "";
    const firstNameFromFullName =
      fullName && fullName.length > 0
        ? (() => {
            const parts = fullName.split(/\s+/).filter(Boolean);
            return parts.length >= 2 ? parts[1]! : parts[0] ?? fullName;
          })()
        : "";
    const displayName = firstNameFromFullName || employeeName || login || "";
    recipientName = displayName || "Получатель";
    savingFor = waiterProfile?.savingFor?.trim() || undefined;
    recipientPhotoUrl =
      tipLink.employee?.photoUrl && tipLink.employee?.id
        ? `${baseUrl.replace(/\/$/, "")}/api/establishment/employees/photo/${tipLink.employee.id}?type=avatar`
        : waiterProfile?.profilePhotoUrl && waiterProfile.id
          ? `${baseUrl.replace(/\/$/, "")}/api/profile/photo/${waiterProfile.id}`
          : undefined;
    if (routingMode === TIP_ROUTING_EMPLOYEE_QR && !tipLink.employee?.userId) {
      paymentUnavailableReason =
        "Официант ещё не подключил личный кабинет — оплата на персональный счёт недоступна.";
    }
    if (routingMode === TIP_ROUTING_POOL_QR && !est?.tipPoolUserId?.trim()) {
      paymentUnavailableReason = "Пул чаевых заведения не настроен";
    }
  } else if (personalRecipientPayUi) {
    const u = tipLink.user;
    const fullName = u.fullName?.trim() || "";
    const login = u.login || "";
    const firstNameFromFullName =
      fullName && fullName.length > 0
        ? (() => {
            const parts = fullName.split(/\s+/).filter(Boolean);
            return parts.length >= 2 ? parts[1]! : parts[0] ?? fullName;
          })()
        : "";
    const displayName = firstNameFromFullName || login || "";
    recipientName = displayName || "Получатель";
    savingFor = u.savingFor?.trim() || undefined;
    recipientPhotoUrl = u.profilePhotoUrl
      ? `${baseUrl.replace(/\/$/, "")}/api/profile/photo/${u.id}`
      : undefined;
  }

  if (establishmentPoolPayUi && (!est?.tipPoolUserId?.trim() || !est?.id)) {
    paymentUnavailableReason = "Приём чаевых для этого заведения не настроен";
  }

  if (!paymentUnavailableReason && !tipLink.user.isBlocked) {
    const resolvedPay = await resolvePayInitForSlug(slug, tipLink);
    if ("error" in resolvedPay) {
      paymentUnavailableReason = resolvedPay.error;
    } else if (recipientCanAcceptIncomingTips(tipLink.userId, paymentSettings)) {
      const limitReason = await evaluateRecipientPayLimitsForPayPage(
        {
          recipientId: resolvedPay.paymentRecipientId,
          tipSplit: resolvedPay.tipSplit,
          limits: platformRow,
        },
        { obscurePlatformDailyLimits: true },
      );
      if (limitReason) paymentUnavailableReason = limitReason;
    }
  }

  const slugNorm = slug.trim().toLowerCase();
  const slugBrandingOverride =
    PAY_PAGE_BRANDING_OVERRIDES[slug] ?? PAY_PAGE_BRANDING_OVERRIDES[slugNorm];
  let branding = mergePayPageBranding(brandingFromEstablishment, slugBrandingOverride);
  const m5LoginSubjectLogin =
    (tipLink.employee?.user?.login || tipLink.user.login || "").trim();
  const m5Login =
    isCabinetM5CompetitionTheme(m5LoginSubjectLogin) &&
    !PAY_PAGE_SLUGS_SKIP_M5_LOGIN_BRANDING.has(slugNorm);
  if (m5Login) {
    branding = mergePayPageBranding(branding, PAY_PAGE_M5_COMPETITION_BRANDING);
  }

  const acceptPayments =
    !tipLink.user.isBlocked &&
    !paymentUnavailableReason &&
    recipientCanAcceptIncomingTips(tipLink.userId, paymentSettings);

  return NextResponse.json({
    recipientName,
    acceptPayments,
    ...(branding && { branding }),
    ...(savingFor && { savingFor }),
    ...(recipientPhotoUrl && { recipientPhotoUrl }),
    ...(paymentUnavailableReason && { paymentUnavailableReason }),
    ...(m5Login && { m5PayShell: true }),
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const requestId = getRequestId(request);
  const { ip, rateLimitKey } = getClientIpAndRateLimitKey(request);
  const { slug } = await params;

  if (DEMO_SLUG && slug === DEMO_SLUG) {
    return NextResponse.json(
      { error: "Это демо-страница. Чтобы получать чаевые, оставьте заявку на подключение." },
      { status: 400 },
    );
  }

  const rateLimitIp = await checkRateLimitByIP(rateLimitKey, PAY_RATE_LIMIT_IP);
  if (!rateLimitIp.allowed) {
    logSecurity("pay.init.rate_limit_ip", { requestId, ip, slug });
    return rateLimit429Response(rateLimitIp);
  }

  const rateLimitSlug = await checkRateLimitByKey(slug, PAY_RATE_LIMIT_SLUG);
  if (!rateLimitSlug.allowed) {
    logSecurity("pay.init.rate_limit_slug", { requestId, ip, slug });
    return rateLimit429Response(rateLimitSlug, "Слишком много запросов по этому коду официанта. Попробуйте позже.");
  }

  if (!verifyCsrfFromRequest(request)) {
    logSecurity("pay.init.csrf_invalid", { requestId, ip, slug });
    return NextResponse.json({ error: "Некорректный запрос. Обновите страницу и попробуйте снова." }, { status: 403 });
  }

  const [tipLink, platformRow] = await Promise.all([
    loadTipLinkForPaySlug(slug),
    getPlatformPaymentSettingsRow(),
  ]);
  const paymentSettings = {
    globalPaymentsDisabled: platformRow.globalPaymentsDisabled,
    paymentWhitelistUserIds: platformRow.paymentWhitelistUserIds,
    paymentBlacklistUserIds: platformRow.paymentBlacklistUserIds,
  };

  if (!tipLink) {
    logSecurity("pay.init.not_found", { requestId, ip, slug });
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 });
  }

  const resolved = await resolvePayInitForSlug(slug, tipLink);
  if ("error" in resolved) {
    logSecurity("pay.init.resolve_blocked", { requestId, ip, slug, reason: resolved.error });
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { paymentRecipientId, tipSplit } = resolved;

  const payRecipientUser = await db.user.findUnique({
    where: { id: paymentRecipientId },
    select: { isBlocked: true },
  });
  if (!payRecipientUser || payRecipientUser.isBlocked) {
    logSecurity("pay.init.recipient_blocked", { requestId, ip, slug, recipientId: paymentRecipientId });
    void recordFraudSignal({
      userId: paymentRecipientId,
      ruleCode: FRAUD_RULE.PAY_RECIPIENT_BLOCKED,
      message: "Попытка инициализации оплаты на заблокированного получателя",
      metadata: { slug },
      dedupeMinutes: 60,
    });
    return NextResponse.json({ error: "Приём чаевых временно недоступен" }, { status: 403 });
  }

  if (!recipientCanAcceptIncomingTips(paymentRecipientId, paymentSettings)) {
    logSecurity("pay.init.policy_blocked", { requestId, ip, slug, recipientId: paymentRecipientId });
    void recordFraudSignal({
      userId: paymentRecipientId,
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

  const recipientLimitMessage = await evaluateRecipientPayLimits(
    {
      recipientId: paymentRecipientId,
      amountKop: amountBigInt,
      tipSplit,
      limits: platformRow,
      idempotencyKey,
    },
    { obscurePlatformDailyLimits: true },
  );
  if (recipientLimitMessage) {
    logSecurity("pay.init.recipient_limit", {
      requestId,
      ip,
      slug,
      recipientId: paymentRecipientId,
    });
    return NextResponse.json({ error: recipientLimitMessage }, { status: 400 });
  }

  const gateway = getPaymentGateway();
  try {
    const result = await gateway.createPayment({
      linkId: tipLink.id,
      recipientId: paymentRecipientId,
      amountKop: amountBigInt,
      idempotencyKey,
      comment: comment ?? null,
      baseUrl,
      initiatorIp: ip,
      tipSplit,
    });

    if (!result.success) {
      logSecurity("pay.init.failed", { requestId, ip, slug });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    observePayInitBurstForSlug(tipLink.id, paymentRecipientId, slug);
    logSecurity("pay.init.success", { requestId, ip, slug, transactionId: result.transactionId });
    const json: {
      success: true;
      transactionId: string;
      redirectUrl?: string;
      redirectToken?: string;
    } = {
      success: true,
      transactionId: result.transactionId,
    };
    if ("redirectUrl" in result && result.redirectUrl) {
      json.redirectUrl = result.redirectUrl;
      try {
        json.redirectToken = createPayRedirectToken(result.transactionId);
      } catch {
        /* без токена клиент уйдёт по redirectUrl на /pay/redirect */
      }
    }
    return NextResponse.json(json);
  } catch (error) {
    logError("pay.init.error", error, { requestId, ip, slug });
    return internalError("Ошибка инициализации платежа");
  }
}
