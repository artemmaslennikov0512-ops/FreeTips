/**
 * GET /api/support/messages — список сообщений чата поддержки текущего пользователя.
 * Query: ?since=messageId — только сообщения после указанного id (для опроса новых).
 * POST /api/support/messages — отправить сообщение. Body: { text }.
 * Только Bearer (личный кабинет); тред создаётся при первом сообщении.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { supportMessageSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH, jsonError, internalError } from "@/lib/api/helpers";
import { logError } from "@/lib/logger";

const STAFF_ROLES = ["ADMIN", "SUPERADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { userId, role } = auth.user;

  // Клиент видит только свой тред; админ не использует этот эндпоинт (у него свой админский)
  if (isStaff(role)) {
    return NextResponse.json({ error: "Используйте админ-раздел для ответов" }, { status: 403 });
  }

  try {
    const thread = await db.supportThread.findUnique({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            authorId: true,
            createdAt: true,
            author: { select: { id: true, login: true, role: true, fullName: true } },
          },
        },
      },
    });

    if (thread) {
      await db.supportThread.update({
        where: { id: thread.id },
        data: { lastReadAt: new Date() },
      });
    }

    const sinceId = request.nextUrl.searchParams.get("since");
    let messages = thread?.messages ?? [];

    if (sinceId && messages.length > 0) {
      const idx = messages.findIndex((m) => m.id === sinceId);
      messages = idx >= 0 ? messages.slice(idx + 1) : messages;
    }

    const list = messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorId: m.authorId,
      isFromStaff: isStaff(m.author.role),
      authorLogin: m.author.login,
      authorName: m.author.fullName ?? undefined,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({ messages: list, threadId: thread?.id ?? null });
  } catch (err) {
    logError("support.messages.get", err, { userId });
    return internalError("Не удалось загрузить сообщения");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const { userId, role } = auth.user;

  if (isStaff(role)) {
    return NextResponse.json({ error: "Отправка от клиента: войдите как получатель" }, { status: 403 });
  }

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = supportMessageSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return jsonError(400, "Неверные данные", parsed.error.issues);
  }

  try {
    let thread = await db.supportThread.findUnique({ where: { userId } });
    if (!thread) {
      try {
        thread = await db.supportThread.create({
          data: { userId },
        });
      } catch (createErr: unknown) {
        // Конкурентный запрос мог уже создать тред (unique userId)
        const code = (createErr as { code?: string })?.code;
        if (code === "P2002") {
          thread = await db.supportThread.findUnique({ where: { userId } });
        }
        if (!thread) throw createErr;
      }
    }

    const message = await db.supportMessage.create({
      data: {
        threadId: thread.id,
        authorId: userId,
        body: parsed.data.text,
      },
      include: {
        author: { select: { id: true, login: true, role: true, fullName: true } },
      },
    });

    await db.supportThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      id: message.id,
      body: message.body,
      authorId: message.authorId,
      isFromStaff: false,
      authorLogin: message.author.login,
      authorName: message.author.fullName ?? undefined,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (err) {
    logError("support.messages.post", err, { userId });
    return internalError("Не удалось отправить сообщение");
  }
}
