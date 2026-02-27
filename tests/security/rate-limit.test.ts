import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRateLimitByIP } from "../../lib/middleware/rate-limit";

test("checkRateLimitByIP blocks after limit", () => {
  const options = { windowMs: 1000, maxRequests: 2, keyPrefix: "test" };
  const first = checkRateLimitByIP("127.0.0.1", options);
  const second = checkRateLimitByIP("127.0.0.1", options);
  const third = checkRateLimitByIP("127.0.0.1", options);
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(third.allowed, false);
});
