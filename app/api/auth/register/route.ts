/**
 * POST /api/auth/register
 * Регистрация: логин, пароль, подтверждение пароля, email (опционально)
 * Создаёт пользователя и выдаёт токены (без SMS)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserRepository } from "@/lib/infrastructure/user-repository";
import { registerSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { generateAccessToken, generateRefreshToken, setRefreshTokenCookie } from "@/lib/auth/jwt";
import { checkRateLimitByIP, getClientIP, AUTH_RATE_LIMIT } from "@/lib/middleware/rate-limit";
import { hashRegistrationToken } from "@/lib/auth/registration-token";
import { getWaiterPaygineSdRef } from "@/lib/payment/paygine-sd-ref";
import { getSystemDefaultLimitsForNewUser } from "@/lib/system-default-limits";
import { logError, logSecurity } from "@/lib/logger";
import { getRequestId } from "@/lib/security/request";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { verifyCsrfFromRequest } from "@/lib/security/csrf";
import { consumeEmailVerified } from "@/lib/email-verification-store";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const ip = getClientIP(request);
  try {
    const rateLimit = await checkRateLimitByIP(ip, AUTH_RATE_LIMIT);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Попробуйте позже." },
        { status: 429 },
      );
    }
    if (!verifyCsrfFromRequest(request)) {
      return NextResponse.json({ error: "Некорректный CSRF токен" }, { status: 403 });
    }

    const parsed = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
    if (!parsed.ok) return parsed.response;
    type RegisterPayload = {
      login: string;
      password: string;
      passwordConfirm: string;
      registrationToken: string;
      email?: string;
    };
    const validated = registerSchema.parse(parsed.data) as RegisterPayload;

    if (validated.email) {
      const verified = consumeEmailVerified(validated.email);
      if (!verified) {
        return NextResponse.json(
          { error: "Подтвердите почту перед регистрацией: введите email, нажмите «Подтвердить почту», введите код из письма." },
          { status: 400 },
        );
      }
    }

    const userRepo = getUserRepository();
    const existing = await userRepo.findByLogin(validated.login);

    if (existing) {
      logSecurity("auth.register.conflict", { requestId, ip, login: validated.login });
      return NextResponse.json(
        { error: "Пользователь с таким логином уже зарегистрирован" },
        { status: 409 },
      );
    }

    const tokenHash = hashRegistrationToken(validated.registrationToken);
    const regToken = await db.registrationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: {
        establishment: { select: { id: true } },
        employee: { select: { id: true, establishmentId: true } },
      },
    });
    if (!regToken) {
      logSecurity("auth.register.invalid_token", { requestId, ip, login: validated.login });
      return NextResponse.json(
        { error: "Неверный или уже использованный токен регистрации" },
        { status: 403 },
      );
    }

    const passwordHash = await hashPassword(validated.password);
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

      const created = await tx.user.create({
        data: {
          login: validated.login,
          passwordHash,
          email: validated.email,
          role,
          establishmentId: establishmentId ?? undefined,
        },
      });
      const defaultLimits = await getSystemDefaultLimitsForNewUser();
      await tx.user.update({
        where: { id: created.id },
        data: {
          paygineSdRef: getWaiterPaygineSdRef(created.id),
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

    await db.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: JSON.stringify({ ip }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logSecurity("auth.register.success", { requestId, ip, userId: user.id });
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
      const details = error.issues.map((e) => ({
        path: e.path.join(".") || "(корневой)",
        message: e.message,
      }));
      const message = details[0]?.message ?? "Неверные данные";
      return jsonError(400, message, details, { hideDetailsInProduction: true });
    }
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json(
        { error: "Неверный или уже использованный токен регистрации" },
        { status: 403 },
      );
    }

    logError("auth.register.error", error, { requestId, ip });
    return internalError("Ошибка при регистрации");
  }
}
