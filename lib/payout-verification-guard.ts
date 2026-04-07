import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole, VerificationStatus } from "@prisma/client";

/**
 * Вывод в ЛК / по API-ключу: только при VERIFIED.
 * SUPERADMIN — исключение для служебных сценариев.
 * Вывод суперадмином от имени пользователя — отдельные admin-роуты.
 */
export async function payoutSelfServiceVerificationError(userId: string): Promise<NextResponse | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (user.role === UserRole.SUPERADMIN) {
    return null;
  }
  if (user.verificationStatus !== VerificationStatus.VERIFIED) {
    return NextResponse.json(
      { error: "Вывод доступен после прохождения верификации профиля" },
      { status: 403 },
    );
  }
  return null;
}
