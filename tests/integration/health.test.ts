/**
 * Интеграционный тест: GET /api/health
 * Проверяет, что хендлер возвращает JSON с полями status, db, latencyMs, timestamp.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";

test("health route returns JSON with status and db", async () => {
  const { GET } = await import("../../app/api/health/route");
  const prev = process.env.HEALTH_CHECK_SECRET;
  try {
    delete process.env.HEALTH_CHECK_SECRET;
    const response = await GET(new NextRequest("http://localhost/api/health"));
    const body = await response.json();

    assert.equal(typeof body.status, "string");
    assert.ok(body.status === "ok" || body.status === "degraded");
    assert.equal(typeof body.db, "string");
    assert.ok(body.db === "ok" || body.db === "error");
    assert.ok(typeof body.latencyMs === "number");
    assert.ok(typeof body.timestamp === "string");

    assert.ok(response.status === 200 || response.status === 503);
  } finally {
    if (prev !== undefined) process.env.HEALTH_CHECK_SECRET = prev;
    else delete process.env.HEALTH_CHECK_SECRET;
  }
});
