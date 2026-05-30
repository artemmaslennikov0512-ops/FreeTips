import assert from "node:assert/strict";
import {
  normalizeBulkUserIdToken,
  parseBulkUserIdTokens,
  toWaiterCodeSlug,
} from "../lib/parse-bulk-user-id-tokens";

assert.equal(normalizeBulkUserIdToken("#123"), "123");
assert.equal(normalizeBulkUserIdToken("ID: #456"), "456");
assert.equal(toWaiterCodeSlug("000-123"), "000-123");
assert.equal(toWaiterCodeSlug("000123"), "000-123");
assert.equal(toWaiterCodeSlug("123"), null);
assert.equal(toWaiterCodeSlug("#000-123"), "000-123");
assert.deepEqual(parseBulkUserIdTokens("000-123\n000-456, 789"), ["000-123", "000-456", "789"]);

console.log("parse-bulk-user-id-tokens: ok");
