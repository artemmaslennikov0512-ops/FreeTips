/**
 * Интеграционный тест: GET /api/health
 * Проверяет, что хендлер возвращает JSON с полями status, db, paygineConfigured.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

test("health route returns JSON with status and db", async () => {
  const { GET } = await import("../../app/api/health/route");
  const response = await GET();
  const body = await response.json();

  assert.equal(typeof body.status, "string");
  assert.ok(body.status === "ok" || body.status === "degraded");
  assert.equal(typeof body.db, "string");
  assert.ok(body.db === "ok" || body.db === "error");
  assert.equal(typeof body.paygineConfigured, "boolean");
  assert.ok(typeof body.latencyMs === "number");
  assert.ok(typeof body.timestamp === "string");

  assert.ok(response.status === 200 || response.status === 503);
});
