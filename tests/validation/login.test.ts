/**
 * Unit-тесты валидации запроса входа (loginRequestSchema)
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { loginRequestSchema } from "../../lib/validations";

test("loginRequestSchema accepts valid login and password", () => {
  const result = loginRequestSchema.safeParse({
    login: "user123",
    password: "Password1",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.login, "user123");
    assert.equal(result.data.password, "Password1");
  }
});

test("loginRequestSchema rejects empty login", () => {
  const result = loginRequestSchema.safeParse({
    login: "",
    password: "Password1",
  });
  assert.equal(result.success, false);
});

test("loginRequestSchema rejects short login", () => {
  const result = loginRequestSchema.safeParse({
    login: "ab",
    password: "Password1",
  });
  assert.equal(result.success, false);
});

test("loginRequestSchema rejects login with invalid characters", () => {
  const result = loginRequestSchema.safeParse({
    login: "user@mail",
    password: "Password1",
  });
  assert.equal(result.success, false);
});

test("loginRequestSchema rejects empty password", () => {
  const result = loginRequestSchema.safeParse({
    login: "user123",
    password: "",
  });
  assert.equal(result.success, false);
});

test("loginRequestSchema rejects missing fields", () => {
  assert.equal(loginRequestSchema.safeParse({}).success, false);
  assert.equal(loginRequestSchema.safeParse({ login: "user" }).success, false);
  assert.equal(loginRequestSchema.safeParse({ password: "Pass1" }).success, false);
});

test("loginRequestSchema accepts optional deviceClientId (UUID v4)", () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const result = loginRequestSchema.safeParse({
    login: "user123",
    password: "Password1",
    deviceClientId: id,
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.deviceClientId, id);
});

test("loginRequestSchema rejects invalid deviceClientId", () => {
  const result = loginRequestSchema.safeParse({
    login: "user123",
    password: "Password1",
    deviceClientId: "not-a-uuid",
  });
  assert.equal(result.success, false);
});
