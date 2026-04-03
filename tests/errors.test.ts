import { test } from "node:test";
import assert from "node:assert/strict";
import { messageFromUnknown } from "@/lib/errors";

test("messageFromUnknown: Error uses message", () => {
  assert.equal(messageFromUnknown(new Error("x")), "x");
});

test("messageFromUnknown: non-Error coerced to string", () => {
  assert.equal(messageFromUnknown("plain"), "plain");
  assert.equal(messageFromUnknown(42), "42");
});
