/**
 * Unit-тесты валидации платежей и выводов (антифрод)
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { PAYMENT_MAX_AMOUNT_KOP } from "../../lib/payment-amount-bounds";
import { PAYOUT_MAX_AMOUNT_KOP, PAYOUT_MIN_AMOUNT_KOP } from "../../lib/payout-amount-bounds";
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

test("createPaymentSchema rejects amount above 100 000 kop (1 000 руб)", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: PAYMENT_MAX_AMOUNT_KOP + 1,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, false);
});

test("createPaymentSchema accepts 100 000 kop max (1 000 руб)", () => {
  const result = createPaymentSchema.safeParse({
    amountKop: PAYMENT_MAX_AMOUNT_KOP,
    idempotencyKey: "test-key-123",
  });
  assert.equal(result.success, true);
});

test("createPayoutSchema rejects amount below minimum (100 ₽)", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: PAYOUT_MIN_AMOUNT_KOP - 1,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, false);
});

test("createPayoutSchema accepts minimum payout amount", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: PAYOUT_MIN_AMOUNT_KOP,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, true);
});

test("createPayoutSchema rejects amount above maximum (100 000 ₽)", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: PAYOUT_MAX_AMOUNT_KOP + 1,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, false);
});

test("createPayoutSchema accepts maximum payout amount", () => {
  const result = createPayoutSchema.safeParse({
    amountKop: PAYOUT_MAX_AMOUNT_KOP,
    details: "Карта 1234 5678 9012 3456",
  });
  assert.equal(result.success, true);
});
