/**
 * GET /api/profile
 * Данные текущего пользователя (login, email, role) и статистика (баланс, всего получено, кол-во платежей, заявок на вывод).
 * PATCH /api/profile — обновление login, email.
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { getPaygineConfig } from "@/lib/config";
import { patchProfileSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { getEffectivePayoutLimits, getEffectiveMonthlyPayoutLimits, getUtcDayStart, getUtcMonthStart } from "@/lib/payout-limits";
import { sdGetBalance } from "@/lib/payment/paygine/client";
import { logError, logInfo } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthOrApiKey(request);
    if ("response" in auth) return auth.response;
    const id = auth.userId;
    const requestId = getRequestId(request);

    const dayStart = getUtcDayStart();
    const monthStart = getUtcMonthStart();

    const [profile, txSum, payoutsCompletedSum, txCount, payoutsPendingCount, limits, monthlyLimits, todayPayouts, monthPayouts, employee] =
      await Promise.all([
        db.user.findUnique({
          where: { id },
          select: {
            id: true,
            uniqueId: true,
            login: true,
            email: true,
            role: true,
            mustChangePassword: true,
            fullName: true,
            birthDate: true,
            establishment: true,
            establishmentId: true,
            establishmentRelation: {
              select: {
                name: true,
                logoUrl: true,
                logoOpacityPercent: true,
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
              },
            },
            apiKey: true,
            apiKeyHash: true,
            paygineSdRef: true,
            autoConfirmPayoutThresholdKop: true,
            verificationStatus: true,
            verificationRejectionReason: true,
            savingFor: true,
            profilePhotoUrl: true,
          },
        }),
        db.transaction.aggregate({
          where: { recipientId: id, status: "SUCCESS" },
          _sum: { amountKop: true },
        }),
        db.payoutRequest.aggregate({
          where: { userId: id, status: "COMPLETED" },
          _sum: { amountKop: true },
        }),
        db.transaction.count({ where: { recipientId: id, status: "SUCCESS" } }),
        db.payoutRequest.count({
          where: { userId: id, status: { in: ["CREATED", "PROCESSING"] } },
        }),
        getEffectivePayoutLimits(id),
        getEffectiveMonthlyPayoutLimits(id),
        db.payoutRequest.aggregate({
          where: {
            userId: id,
            status: "COMPLETED",
            updatedAt: { gte: dayStart },
          },
          _count: true,
          _sum: { amountKop: true },
        }),
        db.payoutRequest.aggregate({
          where: {
            userId: id,
            status: "COMPLETED",
            updatedAt: { gte: monthStart },
          },
          _count: true,
          _sum: { amountKop: true },
        }),
        db.employee.findFirst({
          where: { userId: id },
          select: { id: true, photoUrl: true },
        }),
      ]);

    if (!profile) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    const received = txSum._sum.amountKop ?? BigInt(0);
    const withdrawn = payoutsCompletedSum._sum.amountKop ?? BigInt(0);
    const balanceCalculated = received - withdrawn;
    const todayCount = todayPayouts._count;
    const todaySumKop = todayPayouts._sum.amountKop ?? BigInt(0);
    const monthCount = monthPayouts._count;
    const monthSumKop = monthPayouts._sum.amountKop ?? BigInt(0);

    let balanceKopForStats = Number(balanceCalculated);
    const paygineConfig = getPaygineConfig();
    const sdRef = profile.paygineSdRef?.trim();
    let paygineBalanceKop: number | null = null;
    if (sdRef && paygineConfig) {
      try {
        const paygineBalance = await sdGetBalance(paygineConfig, { sdRef });
        if (paygineBalance.ok) {
          paygineBalanceKop = paygineBalance.balanceKop;
          balanceKopForStats = paygineBalance.balanceKop;
        }
      } catch {
        // При недоступности Paygine отдаём баланс по БД
      }
    }
    logInfo("profile.balance_source", {
      userId: id,
      login: profile.login,
      uniqueId: profile.uniqueId,
      balanceFromDb: Number(balanceCalculated),
      balanceFromPaygine: paygineBalanceKop,
      balanceReturned: balanceKopForStats,
      sdRef: sdRef ?? null,
      transactionsCount: txCount,
    });

    // Ответ только примитивами — гарантированная сериализация без BigInt
    const body = {
      id: String(profile.id),
      uniqueId: Number(profile.uniqueId),
      login: String(profile.login),
      email: profile.email != null ? String(profile.email) : null,
      role: String(profile.role),
      mustChangePassword: Boolean(profile.mustChangePassword),
      fullName: profile.fullName != null ? String(profile.fullName) : null,
      birthDate: profile.birthDate != null ? String(profile.birthDate) : null,
      establishment: profile.establishment != null ? String(profile.establishment) : null,
      establishmentId: profile.establishmentId != null ? String(profile.establishmentId) : null,
      establishmentName:
        profile.establishmentRelation?.name != null
          ? String(profile.establishmentRelation.name)
          : null,
      /** Бренд заведения для ЛК официанта и целостного образа (лого, цвета, фоны) */
      establishmentBrand:
        profile.establishmentRelation != null
          ? {
              logoUrl: profile.establishmentRelation.logoUrl != null ? String(profile.establishmentRelation.logoUrl) : null,
              logoOpacityPercent: profile.establishmentRelation.logoOpacityPercent ?? null,
              primaryColor: profile.establishmentRelation.primaryColor != null ? String(profile.establishmentRelation.primaryColor) : null,
              secondaryColor: profile.establishmentRelation.secondaryColor != null ? String(profile.establishmentRelation.secondaryColor) : null,
              mainBackgroundColor: profile.establishmentRelation.mainBackgroundColor != null ? String(profile.establishmentRelation.mainBackgroundColor) : null,
              mainBackgroundOpacityPercent: profile.establishmentRelation.mainBackgroundOpacityPercent ?? null,
              blocksBackgroundColor: profile.establishmentRelation.blocksBackgroundColor != null ? String(profile.establishmentRelation.blocksBackgroundColor) : null,
              blocksBackgroundOpacityPercent: profile.establishmentRelation.blocksBackgroundOpacityPercent ?? null,
              secondaryOpacityPercent: profile.establishmentRelation.secondaryOpacityPercent ?? null,
              fontColor: profile.establishmentRelation.fontColor != null ? String(profile.establishmentRelation.fontColor) : null,
              borderColor: profile.establishmentRelation.borderColor != null ? String(profile.establishmentRelation.borderColor) : null,
              borderWidthPx: profile.establishmentRelation.borderWidthPx ?? null,
              borderOpacityPercent: profile.establishmentRelation.borderOpacityPercent ?? null,
            }
          : null,
      hasApiKey: !!(profile.apiKey ?? profile.apiKeyHash),
      stats: {
        balanceKop: Number(balanceKopForStats),
        totalReceivedKop: Number(received),
        transactionsCount: Number(txCount),
        payoutsPendingCount: Number(payoutsPendingCount),
      },
      payoutLimits: {
        dailyLimitCount: Number(limits.count),
        dailyLimitKop: Number(limits.kop),
        monthlyLimitCount: monthlyLimits.count != null ? Number(monthlyLimits.count) : null,
        monthlyLimitKop: monthlyLimits.kop != null ? Number(monthlyLimits.kop) : null,
      },
      payoutUsageToday: {
        count: Number(todayCount),
        sumKop: Number(todaySumKop),
      },
      payoutUsageMonth: {
        count: Number(monthCount),
        sumKop: Number(monthSumKop),
      },
      /** Максимальная сумма одной заявки на вывод (коп); для подсказки и валидации на клиенте */
      maxPayoutPerRequestKop:
        profile.autoConfirmPayoutThresholdKop != null
          ? Number(profile.autoConfirmPayoutThresholdKop)
          : 10_000_000, // 100 000 ₽ по умолчанию
      verificationStatus: String(profile.verificationStatus),
      verificationRejectionReason: profile.verificationRejectionReason != null ? String(profile.verificationRejectionReason) : null,
      savingFor: profile.savingFor != null ? String(profile.savingFor) : null,
      /** Фото для ЛК (страница оплаты и сайдбар): EMPLOYEE — из Employee, RECIPIENT — из User.profilePhotoUrl. */
      employeePhotoUrl:
        employee?.photoUrl && employee?.id
          ? `${getBaseUrlFromRequest(request).replace(/\/$/, "")}/api/establishment/employees/photo/${employee.id}?type=avatar`
          : profile.profilePhotoUrl && profile.role === "RECIPIENT"
            ? `${getBaseUrlFromRequest(request).replace(/\/$/, "")}/api/profile/photo/${profile.id}`
            : null,
    };
    return NextResponse.json(body);
  } catch (err) {
    const requestId = getRequestId(request);
    logError("profile.get.error", err, { requestId });
    const devMessage = err instanceof Error ? err.message : String(err);
    // Для отладки: заголовок X-Debug-Profile-Error: 1 — вернуть реальную ошибку в ответе
    const wantDebug = request.headers.get("x-debug-profile-error") === "1";
    if (wantDebug) {
      return NextResponse.json(
        { error: "Не удалось загрузить профиль", debug: devMessage },
        { status: 500 },
      );
    }
    return internalError("Не удалось загрузить профиль", devMessage);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = patchProfileSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const message = firstIssue?.message ?? "Неверные данные";
    return jsonError(400, message, parsed.error.issues);
  }

  const data = parsed.data;
  const allowedKeys = ["login", "email", "fullName", "birthDate", "establishment", "savingFor"] as const;
  const update = Object.fromEntries(
    allowedKeys.filter((k) => data[k] !== undefined).map((k) => [k, data[k]])
  ) as { login?: string; email?: string | null; fullName?: string | null; birthDate?: string | null; establishment?: string | null; savingFor?: string | null };
  if (Object.keys(update).length === 0) {
    return jsonError(400, "Нечего обновлять");
  }

  if (update.login) {
    const taken = await db.user.findFirst({
      where: {
        login: { equals: update.login, mode: "insensitive" },
        NOT: { id: auth.userId },
      },
    });
    if (taken) {
      return NextResponse.json({ error: "Логин уже занят" }, { status: 409 });
    }
  }

  if (update.email !== undefined && update.email !== null) {
    const emailNormalized = update.email.trim().toLowerCase();
    const taken = await db.user.findFirst({
      where: {
        email: { equals: emailNormalized, mode: "insensitive" },
        NOT: { id: auth.userId },
      },
    });
    if (taken) {
      return NextResponse.json({ error: "Email уже занят" }, { status: 409 });
    }
    update.email = emailNormalized;
  }

  const profile = await db.user.update({
    where: { id: auth.userId },
    data: update,
    select: { id: true, uniqueId: true, login: true, email: true, role: true, fullName: true, birthDate: true, establishment: true, savingFor: true },
  });

  return NextResponse.json(profile);
}
