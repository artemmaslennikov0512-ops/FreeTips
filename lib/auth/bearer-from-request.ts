import type { NextRequest } from "next/server";

/** Только заголовок `Authorization: Bearer …` (без cookie). */
export function getBearerTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const t = authHeader.slice(7).trim();
  return t || null;
}

export function hasAuthorizationBearer(request: NextRequest): boolean {
  return getBearerTokenFromRequest(request) !== null;
}
