/**
 * GET /api/admin/support/threads — список тредов поддержки (для админа).
 * Сортировка по updatedAt по убыванию.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await requireRole(["ADMIN"])(request);
  if ("response" in auth) return auth.response;

  try {
    const threads = await db.supportThread.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            login: true,
            fullName: true,
            email: true,
            establishment: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            body: true,
            authorId: true,
            createdAt: true,
            author: { select: { role: true } },
          },
        },
      },
    });

    const list = threads.map((t) => {
      const last = t.messages[0];
      return {
        id: t.id,
        userId: t.userId,
        userLogin: t.user.login,
        userFullName: t.user.fullName ?? undefined,
        userEmail: t.user.email ?? undefined,
        establishment: t.user.establishment ?? undefined,
        updatedAt: t.updatedAt.toISOString(),
        lastMessage: last
          ? {
              id: last.id,
              body: last.body.length > 120 ? last.body.slice(0, 120) + "…" : last.body,
              fromStaff: last.author.role === "ADMIN" || last.author.role === "SUPERADMIN",
              createdAt: last.createdAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ threads: list });
  } catch (err) {
    logError("admin.support.threads.get", err);
    return NextResponse.json(
      { error: "Не удалось загрузить список обращений" },
      { status: 500 },
    );
  }
}
