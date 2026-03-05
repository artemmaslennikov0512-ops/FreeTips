import assert from "node:assert/strict";
import { test } from "node:test";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../lib/security/csrf";
import { getCsrfHeader } from "../../lib/security/csrf-client";

test("getCsrfHeader returns empty when cookie missing", () => {
  const original = globalThis.document;
  // @ts-expect-error test shim
  globalThis.document = { cookie: "" };
  const header = getCsrfHeader();
  assert.equal(Object.keys(header).length, 0);
  globalThis.document = original;
});

test("getCsrfHeader returns token from cookie", () => {
  const original = globalThis.document;
  const value = "token-123";
  // @ts-expect-error test shim
  globalThis.document = { cookie: `${CSRF_COOKIE_NAME}=${value}` };
  const header = getCsrfHeader();
  assert.equal(header[CSRF_HEADER_NAME], value);
  globalThis.document = original;
});
