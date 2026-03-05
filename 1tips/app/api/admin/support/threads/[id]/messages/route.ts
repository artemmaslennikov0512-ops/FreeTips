/**
 * GET /api/admin/support/threads/[id]/messages — сообщения треда.
 * POST /api/admin/support/threads/[id]/messages — ответ поддержки. Body: { text }.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { supportMessageSchema } from "@/lib/validations";
import { parseJsonWithLimit, MAX_BODY_SIZE_AUTH } from "@/lib/api/helpers";
import { logError } from "@/lib/logger";

const STAFF_ROLES = ["ADMIN", "SUPERADMIN"];

function isStaff(role: string): boolean {
  return STAFF_ROLES.includes(role);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["ADMIN"])(request);
  if ("response" in auth) return auth.response;

  const { id: threadId } = await params;

  const thread = await db.supportThread.findUnique({
    where: { id: threadId },
    include: {
      user: { select: { id: true, login: true, fullName: true, email: true, establishment: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, login: true, role: true, fullName: true } },
        },
      },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Тред не найден" }, { status: 404 });
  }

  const messages = thread.messages.map((m) => ({
    id: m.id,
    body: m.body,
    authorId: m.authorId,
    isFromStaff: isStaff(m.author.role),
    authorLogin: m.author.login,
    authorName: m.author.fullName ?? undefined,
    createdAt: m.createdAt.toISOString(),
  }));

  return NextResponse.json({
    threadId: thread.id,
    user: {
      id: thread.user.id,
      login: thread.user.login,
      fullName: thread.user.fullName ?? undefined,
      email: thread.user.email ?? undefined,
      establishment: thread.user.establishment ?? undefined,
    },
    messages,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(["ADMIN"])(request);
  if ("response" in auth) return auth.response;
  const staffUserId = auth.user.userId;

  const { id: threadId } = await params;

  const thread = await db.supportThread.findUnique({ where: { id: threadId } });
  if (!thread) {
    return NextResponse.json({ error: "Тред не найден" }, { status: 404 });
  }

  const parsedBody = await parseJsonWithLimit(request, MAX_BODY_SIZE_AUTH);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = supportMessageSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const message = await db.supportMessage.create({
      data: {
        threadId,
        authorId: staffUserId,
        body: parsed.data.text,
      },
      include: {
        author: { select: { id: true, login: true, role: true, fullName: true } },
      },
    });

    await db.supportThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      id: message.id,
      body: message.body,
      authorId: message.authorId,
      isFromStaff: true,
      authorLogin: message.author.login,
      authorName: message.author.fullName ?? undefined,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (err) {
    logError("admin.support.threads.messages.post", err, { threadId, staffUserId });
    return NextResponse.json(
      { error: "Не удалось отправить сообщение" },
      { status: 500 },
    );
  }
}
