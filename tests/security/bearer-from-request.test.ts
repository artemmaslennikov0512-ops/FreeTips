import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import {
  getBearerTokenFromRequest,
  hasAuthorizationBearer,
} from "../../lib/auth/bearer-from-request";

test("getBearerTokenFromRequest trims token", () => {
  const req = new NextRequest("http://localhost/", {
    headers: { authorization: "Bearer   abc.def  " },
  });
  assert.equal(getBearerTokenFromRequest(req), "abc.def");
});

test("getBearerTokenFromRequest returns null without header", () => {
  const req = new NextRequest("http://localhost/");
  assert.equal(getBearerTokenFromRequest(req), null);
});

test("getBearerTokenFromRequest rejects non-Bearer", () => {
  const req = new NextRequest("http://localhost/", {
    headers: { authorization: "Basic dGVzdA==" },
  });
  assert.equal(getBearerTokenFromRequest(req), null);
});

test("getBearerTokenFromRequest returns null for empty Bearer value", () => {
  const req = new NextRequest("http://localhost/", {
    headers: { authorization: "Bearer   " },
  });
  assert.equal(getBearerTokenFromRequest(req), null);
});

test("hasAuthorizationBearer mirrors presence", () => {
  const withBearer = new NextRequest("http://localhost/", {
    headers: { authorization: "Bearer x" },
  });
  assert.equal(hasAuthorizationBearer(withBearer), true);
  const without = new NextRequest("http://localhost/");
  assert.equal(hasAuthorizationBearer(without), false);
});
