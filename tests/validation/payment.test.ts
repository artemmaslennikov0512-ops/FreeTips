/**
 * Unit-тесты валидации платежей и выводов (антифрод)
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { createPaymentSchema, createPayoutSchema } from "../../lib/validations";

test("createPaymentSchema accepts valid payment", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: 50000, // 500 ₽
    comment: "Спасибо!",
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, true);
});

test("createPaymentSchema rejects amount below 100 kop (1 руб)", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: 99,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, false);
});

test("createPaymentSchema accepts 100 kop (1 руб) minimum", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: 100,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, true);
});

test("createPaymentSchema rejects amount above 5 000 000 kop (50 000 руб)", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: 5000001,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, false);
});

test("createPaymentSchema accepts 5 000 000 kop max", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: 5000000,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, true);
});

test("createPayoutSchema rejects amount below 10 000 kop (100 руб)", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: 9999,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, false);
});

test("createPayoutSchema accepts 10 000 kop (100 руб) minimum", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: 10000,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, true);
});

test("createPayoutSchema rejects amount above 10 000 000 kop (100 000 руб)", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: 10000001,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, false);
});

test("createPayoutSchema accepts 10 000 000 kop max", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: 10000000,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, true);
});
