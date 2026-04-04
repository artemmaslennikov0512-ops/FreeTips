/**
 * POST /api/auth/register
 * Регистрация по одноразовому токену: логин, пароль, подтверждение пароля, кодовое слово
 * Создаёт пользователя и выдаёт токены (без SMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserRepository } from "@/lib/infrastructure/user-repository";
import { registerSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { encryptRecoveryCodewordForAdminDisplay } from "@/lib/auth/recovery-codeword-crypto";
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIpAndRateLimitKey, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { hashRegistrationToken } from "@/lib/auth/registration-token";
import { getWaiterPaygineSdRef } from "@/lib/payment/paygine-sd-ref";
import { getSystemDefaultLimitsForNewUser } from "@/lib/system-default-limits";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError, rateLimit429Response, zodErrorResponse } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { observeSharedAuthIp } from "@/lib/fraud-velocity-observe";
import { buildNewSessionMetadata } from "@/lib/auth-session-metadata";
import { toDateInputValueFromApi } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const { ip, rateLimitKey } = getClientIpAndRateLimitKey(request);
  try {
    const rateLimit = await checkRateLimitByIP(rateLimitKey, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) return rateLimit429Response(rateLimit);
    if (!verifyCsrfFromRequest(request)) {
      return jsonError(403, "Некорректный CSRF токен");
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    const validated = registerSchema.parse(parsed.data);

    const userRepo = getUserRepository();
    const existing = await userRepo.findByLogin(validated.login);

    if (existing) {
      logSecurity("auth.register.conflict", { requestId, ip, login: validated.login });
      return jsonError(409, "Пользователь с таким логином уже зарегистрирован");
    }

    const tokenHash = hashRegistrationToken(validated.registrationToken);
    const regToken = await db.registrationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: {
        establishment: { select: { id: true } },
        employee: { select: { id: true, establishmentId: true } },
        registrationRequest: {
          select: {
            fullName: true,
            email: true,
            dateOfBirth: true,
            establishment: true,
            companyName: true,
          },
        },
      },
    });
    if (!regToken) {
      logSecurity("auth.register.invalid_token", { requestId, ip, login: validated.login });
      return jsonError(403, "Неверный или уже использованный токен регистрации");
    }

    const passwordHash = await hashPassword(validated.password);
    const recoveryCodewordHash = await hashPassword(validated.recoveryCodeword);
    const recoveryCodewordEnc = encryptRecoveryCodewordForAdminDisplay(validated.recoveryCodeword);
    const isEstablishmentAdminToken = !!regToken.establishmentId;
    const isEmployeeToken = !!regToken.employeeId;

    const user = await db.$transaction(async (tx) => {
      const claimed = await tx.registrationToken.updateMany({
        where: { id: regToken!.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) {
        logSecurity("auth.register.token_already_used", { requestId, ip, login: validated.login });
        throw new Error("TOKEN_ALREADY_USED");
      }

      const role = isEstablishmentAdminToken
        ? "ESTABLISHMENT_ADMIN"
        : isEmployeeToken
          ? "EMPLOYEE"
          : "RECIPIENT";
      const establishmentId =
        isEstablishmentAdminToken && regToken!.establishment
          ? regToken!.establishment.id
          : isEmployeeToken && regToken!.employee
            ? regToken!.employee.establishmentId
            : null;

      const reqRow = regToken!.registrationRequest;
      let profileEmail = reqRow?.email?.trim() || undefined;
      if (profileEmail) {
        const emailTaken = await tx.user.findUnique({
          where: { email: profileEmail },
          select: { id: true },
        });
        if (emailTaken) profileEmail = undefined;
      }
      const profileFullName = reqRow?.fullName?.trim();
      const birthIso = reqRow?.dateOfBirth ? toDateInputValueFromApi(reqRow.dateOfBirth) : "";
      const establishmentFree =
        reqRow?.establishment?.trim() || reqRow?.companyName?.trim() || "";

      const created = await tx.user.create({
        data: {
          login: validated.login,
          passwordHash,
          recoveryCodewordHash,
          recoveryCodewordEnc,
          role,
          establishmentId: establishmentId ?? undefined,
          ...(profileEmail ? { email: profileEmail } : {}),
          ...(profileFullName ? { fullName: profileFullName } : {}),
          ...(birthIso ? { birthDate: birthIso } : {}),
          ...(establishmentFree ? { establishment: establishmentFree } : {}),
        },
      });
      const defaultLimits = await getSystemDefaultLimitsForNewUser();
      await tx.user.update({
        where: { id: created.id },
        data: {
          paygineSdRef: getWaiterPaygineSdRef(created.id),
          lastAuthIp: ip,
          ...defaultLimits,
        },
      });
      if (isEmployeeToken && regToken!.employee) {
        await tx.employee.update({
          where: { id: regToken!.employee.id },
          data: { userId: created.id },
        });
      }
      await tx.registrationToken.update({
        where: { id: regToken!.id },
        data: { usedById: created.id },
      });
      return created;
    });

    const tokenPayload = {
      userId: user.id,
      login: user.login,
      role: user.role,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    await setRefreshTokenCookie(refreshToken);

    const meta = buildNewSessionMetadata(request, ip, validated.deviceClientId);
    await db.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: meta.deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logSecurity("auth.register.success", { requestId, ip, userId: user.id });
    void observeSharedAuthIp(user.id, ip);
    return NextResponse.json(
      {
        accessToken,
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error);
    }
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return jsonError(403, "Неверный или уже использованный токен регистрации");
    }

    logError("auth.register.error", error, { requestId, ip });
    return internalError("Ошибка при регистрации");
  }
}
