/**
 * GET /api/profile
 * Данные текущего пользователя (login, email, role) и статистика: баланс из БД (как при выводе), всего получено, кол-во платежей, заявок на вывод.
 * PATCH /api/profile — обновление полей профиля (login, email, ФИО, дата рождения и др.).
 * Требует: Authorization: Bearer <access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";
import { getPaygineConfig } from "@/lib/config";
import { patchProfileSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import {
  getEffectivePayoutLimits,
  getEffectiveMonthlyPayoutLimits,
  getUtcDayStart,
  getUtcMonthStart,
  computeEffectiveMaxPayoutPerRequestKop,
} from "@/lib/payout-limits";
import { sumIncomingSuccessNetKopUtcMonth } from "@/lib/recipient-pay-limits";
import { sdGetBalance } from "@/lib/payment/paygine/client";
import { logError, logInfo } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { getBaseUrlFromRequest } from "@/lib/get-base-url";
import { messageFromUnknown } from "@/lib/errors";
import { getBalance } from "@/lib/balance";

/** Кэш ответа Paygine sdGetBalance по userId (только для логов/мониторинга; основной баланс в ответе — из БД). TTL: PAYGINE_BALANCE_CACHE_TTL_SEC (по умолчанию 30 сек). */
const PAYGINE_BALANCE_CACHE_TTL_MS =
  (Number(process.env.PAYGINE_BALANCE_CACHE_TTL_SEC) || 30) * 1000;
const paygineBalanceCache = new Map<
  string,
  { balanceKop: number; cachedAt: number }
>();
const PROFILE_BALANCE_SOURCE_LOG_EVERY_MS =
  (Number(process.env.PROFILE_BALANCE_SOURCE_LOG_EVERY_SEC) || 300) * 1000;
const profileBalanceSourceLogState = new Map<
  string,
  {
    lastLoggedAt: number;
    lastBalanceFromDb: number;
    lastBalanceFromPaygine: number | null;
    lastBalanceReturned: number;
  }
>();

function getCachedPaygineBalance(userId: string): number | null {
  const entry = paygineBalanceCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt >= PAYGINE_BALANCE_CACHE_TTL_MS) {
    paygineBalanceCache.delete(userId);
    return null;
  }
  return entry.balanceKop;
}

function setCachedPaygineBalance(userId: string, balanceKop: number): void {
  paygineBalanceCache.set(userId, { balanceKop, cachedAt: Date.now() });
}

function buildWeakEtagFromJson(payload: unknown): string {
  const json = JSON.stringify(payload);
  const digest = createHash("sha1").update(json).digest("base64url").slice(0, 16);
  return `W/"${json.length.toString(16)}-${digest}"`;
}

function shouldLogProfileBalanceSource(
  userId: string,
  snapshot: {
    balanceFromDb: number;
    balanceFromPaygine: number | null;
    balanceReturned: number;
  },
): boolean {
  const now = Date.now();
  const prev = profileBalanceSourceLogState.get(userId);
  if (!prev) {
    profileBalanceSourceLogState.set(userId, {
      lastLoggedAt: now,
      lastBalanceFromDb: snapshot.balanceFromDb,
      lastBalanceFromPaygine: snapshot.balanceFromPaygine,
      lastBalanceReturned: snapshot.balanceReturned,
    });
    return true;
  }

  const changed =
    prev.lastBalanceFromDb !== snapshot.balanceFromDb ||
    prev.lastBalanceFromPaygine !== snapshot.balanceFromPaygine ||
    prev.lastBalanceReturned !== snapshot.balanceReturned;
  const periodic = now - prev.lastLoggedAt >= PROFILE_BALANCE_SOURCE_LOG_EVERY_MS;
  if (changed || periodic) {
    profileBalanceSourceLogState.set(userId, {
      lastLoggedAt: now,
      lastBalanceFromDb: snapshot.balanceFromDb,
      lastBalanceFromPaygine: snapshot.balanceFromPaygine,
      lastBalanceReturned: snapshot.balanceReturned,
    });
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const auth = await requireAuthOrApiKey(request);
    if ("response" in auth) return auth.response;
    const id = auth.userId;

    const dayStart = getUtcDayStart();
    const monthStart = getUtcMonthStart();
    const [profile, balanceRow, txCount, payoutsPendingCount, limits, monthlyLimits, todayPayouts, monthPayouts, incomingMonthSuccessKop, employee] =
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
            clientNickname: true,
            clientJobTitle: true,
            profilePhotoUrl: true,
            totpEnabled: true,
            totpSecretEnc: true,
            incomingMonthlyLimitKop: true,
          },
        }),
        getBalance(id),
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
        sumIncomingSuccessNetKopUtcMonth(id, monthStart),
        db.employee.findFirst({
          where: { userId: id },
          select: { id: true, photoUrl: true },
        }),
      ]);

    if (!profile) {
      return jsonError(404, "Пользователь не найден");
    }

    const received = balanceRow.receivedKop;
    const balanceCalculated = balanceRow.balanceKop;
    const todayCount = todayPayouts._count;
    const todaySumKop = todayPayouts._sum.amountKop ?? BigInt(0);
    const monthCount = monthPayouts._count;
    const monthSumKop = monthPayouts._sum.amountKop ?? BigInt(0);

    /** Основной баланс для ЛК и вывода — учёт в БД (совпадает с getBalance в /api/payouts). */
    const balanceKopForStats = Number(balanceCalculated);
    const paygineConfig = getPaygineConfig();
    const sdRef = profile.paygineSdRef?.trim();
    let paygineBalanceKop: number | null = null;
    if (sdRef && paygineConfig) {
      const cached = getCachedPaygineBalance(id);
      if (cached !== null) {
        paygineBalanceKop = cached;
      } else {
        try {
          const paygineBalance = await sdGetBalance(paygineConfig, { sdRef });
          if (paygineBalance.ok) {
            paygineBalanceKop = paygineBalance.balanceKop;
            setCachedPaygineBalance(id, paygineBalance.balanceKop);
          }
        } catch {
          /* Paygine недоступен — в ответе только БД, в логе paygineBalanceKop останется null */
        }
      }
    }
    const balanceSourceSnapshot = {
      balanceFromDb: Number(balanceCalculated),
      balanceFromPaygine: paygineBalanceKop,
      balanceReturned: balanceKopForStats,
    };
    if (shouldLogProfileBalanceSource(id, balanceSourceSnapshot)) {
      logInfo("profile.balance_source", {
        userId: id,
        login: profile.login,
        uniqueId: profile.uniqueId,
        ...balanceSourceSnapshot,
        sdRef: sdRef ?? null,
        transactionsCount: txCount,
      });
    }

    const maxPayoutPerRequestKop = Number(
      computeEffectiveMaxPayoutPerRequestKop({
        autoConfirmPayoutThresholdKop: profile.autoConfirmPayoutThresholdKop ?? null,
        dailyLimitKop: limits.kop,
        todayCompletedSumKop: todaySumKop,
        monthlyLimitKop: monthlyLimits.kop,
        monthCompletedSumKop: monthSumKop,
      }),
    );

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
      incomingMonthlyLimitKop:
        profile.incomingMonthlyLimitKop != null ? Number(profile.incomingMonthlyLimitKop) : null,
      incomingMonthSuccessSumKop: Number(incomingMonthSuccessKop),
      payoutUsageToday: {
        count: Number(todayCount),
        sumKop: Number(todaySumKop),
      },
      payoutUsageMonth: {
        count: Number(monthCount),
        sumKop: Number(monthSumKop),
      },
      /** Максимальная сумма одной заявки на вывод (коп); для подсказки и валидации на клиенте */
      maxPayoutPerRequestKop,
      verificationStatus: String(profile.verificationStatus),
      verificationRejectionReason: profile.verificationRejectionReason != null ? String(profile.verificationRejectionReason) : null,
      savingFor: profile.savingFor != null ? String(profile.savingFor) : null,
      clientNickname: profile.clientNickname != null ? String(profile.clientNickname) : null,
      clientJobTitle: profile.clientJobTitle != null ? String(profile.clientJobTitle) : null,
      totpEnabled: Boolean(profile.totpEnabled),
      totpEnrollmentPending: Boolean(profile.totpSecretEnc && !profile.totpEnabled),
      /** Фото для ЛК (страница оплаты и сайдбар): EMPLOYEE — из Employee, RECIPIENT — из User.profilePhotoUrl. */
      employeePhotoUrl:
        employee?.photoUrl && employee?.id
          ? `${getBaseUrlFromRequest(request).replace(/\/$/, "")}/api/establishment/employees/photo/${employee.id}?type=avatar`
          : profile.profilePhotoUrl && profile.role === "RECIPIENT"
            ? `${getBaseUrlFromRequest(request).replace(/\/$/, "")}/api/profile/photo/${profile.id}`
            : null,
    };
    const etag = buildWeakEtagFromJson(body);
    const ifNoneMatch = request.headers.get("if-none-match")?.trim();
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= 1200) {
      logInfo("profile.slow_request", {
        userId: id,
        elapsedMs,
        source: "profile.get",
      });
    }
    return NextResponse.json(body, {
      headers: {
        ETag: etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    const requestId = getRequestId(request);
    logError("profile.get.error", err, { requestId });
    const devMessage = messageFromUnknown(err);
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
    logInfo("profile.patch.validation_failed", {
      userId: auth.userId,
      message,
      path: firstIssue?.path,
      issuesCount: parsed.error.issues.length,
    });
    return jsonError(400, message, parsed.error.issues);
  }

  const data = parsed.data;
  const allowedKeys = [
    "login",
    "email",
    "fullName",
    "birthDate",
    "establishment",
    "savingFor",
    "clientNickname",
    "clientJobTitle",
  ] as const;
  const update = Object.fromEntries(
    allowedKeys.filter((k) => data[k] !== undefined).map((k) => [k, data[k]])
  ) as {
    login?: string;
    email?: string | null;
    fullName?: string | null;
    birthDate?: string | null;
    establishment?: string | null;
    savingFor?: string | null;
    clientNickname?: string | null;
    clientJobTitle?: string | null;
  };

  if (Object.keys(update).length === 0) {
    logInfo("profile.patch.nothing_to_update", { userId: auth.userId });
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
      return jsonError(409, "Логин уже занят");
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
      return jsonError(409, "Email уже занят");
    }
    update.email = emailNormalized;
  }

  try {
    const profile = await db.user.update({
      where: { id: auth.userId },
      data: update,
      select: {
        id: true,
        uniqueId: true,
        login: true,
        email: true,
        role: true,
        fullName: true,
        birthDate: true,
        establishment: true,
        savingFor: true,
        clientNickname: true,
        clientJobTitle: true,
      },
    });
    logInfo("profile.patch.ok", { userId: auth.userId, uniqueId: profile.uniqueId, updatedKeys: Object.keys(update) });
    return NextResponse.json(profile);
  } catch (err) {
    const requestId = getRequestId(request);
    logError("profile.patch.error", err, { requestId, userId: auth.userId });
    return jsonError(500, "Не удалось сохранить данные. Попробуйте позже.");
  }
}

