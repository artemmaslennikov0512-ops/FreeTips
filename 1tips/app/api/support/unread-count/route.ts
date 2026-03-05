/**
 * GET /api/support/unread-count — количество непрочитанных сообщений от поддержки.
 * Непрочитанные = сообщения от сотрудников (ADMIN/SUPERADMIN), созданные после lastReadAt треда.
 * Только для клиента (Bearer), не для админа.
 */

import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { logError } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { userId, role } = auth.user;

  if (role === "ADMIN" || role === "SUPERADMIN") {
    return NextResponse.json({ count: 0 });
  }

  try {
    const thread = await db.supportThread.findUnique({
      where: { userId },
      select: { id: true, lastReadAt: true, createdAt: true },
    });

    if (!thread) {
      return NextResponse.json({ count: 0 });
    }

    const after = thread.lastReadAt ?? thread.createdAt;

    const count = await db.supportMessage.count({
      where: {
        threadId: thread.id,
        createdAt: { gt: after },
        author: { role: { in: [UserRole.ADMIN, UserRole.SUPERADMIN] } },
      },
    });

    return NextResponse.json({ count });
  } catch (err) {
    logError("support.unread-count.get", err, { userId });
    return NextResponse.json({ count: 0 });
  }
}
