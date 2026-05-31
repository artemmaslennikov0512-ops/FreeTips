import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuthOrApiKey } from "@/lib/auth-or-api-key";
import { db } from "@/lib/db";

const TIP_ID_MAX_LENGTH = 64;

export async function POST(request: NextRequest) {
  const auth = await requireAuthOrApiKey(request);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const tipId = typeof body === "object" && body !== null
    ? String((body as { tipId?: unknown }).tipId ?? "").trim()
    : "";
  if (!tipId || tipId.length > TIP_ID_MAX_LENGTH) {
    return NextResponse.json({ error: "Некорректный tipId" }, { status: 400 });
  }

  const rows = await db.$queryRaw<Array<{ inserted: number }>>(Prisma.sql`
    INSERT INTO "tip_push_deliveries" ("userId", "tipId")
    VALUES (${auth.userId}, ${tipId})
    ON CONFLICT ("userId", "tipId") DO NOTHING
    RETURNING 1 AS inserted
  `);

  return NextResponse.json({
    ok: true,
    claimed: rows.length > 0,
  });
}
