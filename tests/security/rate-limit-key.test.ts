import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { getClientIpAndRateLimitKey } from "../../lib/middleware/rate-limit";

test("getClientIpAndRateLimitKey keeps unknown-ip buckets separate by cookies", () => {
  const reqA = new NextRequest("http://localhost/api/auth/login", {
    headers: {
      "user-agent": "Mozilla/5.0 (Linux; Android 14)",
      "accept-language": "ru-RU,ru;q=0.9",
      cookie: "csrfToken=csrf-a; refreshToken=refresh-a; accessToken=access-a",
    },
  });
  const reqB = new NextRequest("http://localhost/api/auth/login", {
    headers: {
      "user-agent": "Mozilla/5.0 (Linux; Android 14)",
      "accept-language": "ru-RU,ru;q=0.9",
      cookie: "csrfToken=csrf-b; refreshToken=refresh-b; accessToken=access-b",
    },
  });

  const a = getClientIpAndRateLimitKey(reqA);
  const b = getClientIpAndRateLimitKey(reqB);

  assert.equal(a.ip, "unknown");
  assert.equal(b.ip, "unknown");
  assert.notEqual(a.rateLimitKey, b.rateLimitKey);
});
